import manifest from "./manifest.json";
import { DurableObject } from "cloudflare:workers";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

const vocabularyIndex = new Map(
  manifest.vocabulary.map((word, index) => [word, index]),
);
const expectedRankingBytes = manifest.vocabulary.length * Uint16Array.BYTES_PER_ELEMENT;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  });
}

function puzzleFor(now = new Date()) {
  const date = now.toISOString().slice(0, 10);
  const day = Math.floor(
    (Date.parse(`${date}T00:00:00.000Z`) - Date.parse(`${manifest.anchor}T00:00:00.000Z`)) /
      86_400_000,
  );
  const index = ((day % manifest.count) + manifest.count) % manifest.count;

  return {
    date,
    index,
    id: `${manifest.version}:${date}`,
    number: day + 1,
    nextReset: new Date(Date.parse(`${date}T00:00:00.000Z`) + 86_400_000).toISOString(),
    vocabularySize: manifest.vocabulary.length,
  };
}

function publicPuzzle(puzzle) {
  const { index: _index, ...publicData } = puzzle;
  return publicData;
}

function rankingKey(index) {
  return `rankings/${String(index).padStart(4, "0")}.bin`;
}

const PLAYER_COOKIE = "ctxai_player";

function playerIdFromRequest(request) {
  const cookie = request.headers.get("cookie") || "";
  const pair = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${PLAYER_COOKIE}=`));
  const playerId = pair?.slice(PLAYER_COOKIE.length + 1);
  return playerId && /^[0-9a-f-]{36}$/i.test(playerId) ? playerId : null;
}

function playerCookie(playerId) {
  return `${PLAYER_COOKIE}=${playerId}; Path=/; Max-Age=172800; HttpOnly; Secure; SameSite=Lax`;
}

function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

async function rateLimitPassed(binding, key) {
  if (!binding) return true;
  try {
    return (await binding.limit({ key })).success;
  } catch {
    return false;
  }
}

function dailyLeaderboard(env, puzzle) {
  return env.LEADERBOARD.getByName(puzzle.id);
}

function unavailable(puzzle) {
  return json(
    { error: "Puzzle data temporarily unavailable", ...publicPuzzle(puzzle) },
    503,
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let path;
    try {
      path = decodeURIComponent(url.pathname);
    } catch {
      return json({ error: "Invalid path" }, 400);
    }

    // Ranking files are private R2 objects and must never be exposed by the
    // static asset binding.
    if (path.startsWith("/_rankings")) return json({ error: "Not found" }, 404);

    if (!path.startsWith("/api/") && !path.startsWith("/check/")) {
      return env.ASSETS.fetch(request);
    }
    const puzzle = puzzleFor();
    const data = publicPuzzle(puzzle);

    if (path === "/api/health") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
      return json({ status: "ok", engine: manifest.model });
    }

    if (path === "/api/today") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
      try {
        const object = await env.RANKINGS.head(rankingKey(puzzle.index));
        if (!object || object.size !== expectedRankingBytes) return unavailable(puzzle);
        return json(data);
      } catch {
        return unavailable(puzzle);
      }
    }

    if (path === "/api/leaderboard/session") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (request.headers.get("origin") !== url.origin) {
        return json({ error: "Player sessions must be created from ContextAI" }, 403);
      }
      try {
        const board = dailyLeaderboard(env, puzzle);
        const existingId = playerIdFromRequest(request);
        const existingPlayer = existingId ? await board.findPlayer(existingId) : null;
        if (existingPlayer) return json({ playerAlias: existingPlayer.alias });
        if (!(await rateLimitPassed(env.SESSION_RATE_LIMIT, `session:${clientIp(request)}`))) {
          return json({ error: "Too many new player sessions from this network. Try again in a minute." }, 429);
        }
        const player = await board.createPlayer();
        return json({ playerAlias: player.alias }, 200, { "set-cookie": playerCookie(player.playerId) });
      } catch {
        return json({ error: "Player session temporarily unavailable" }, 503);
      }
    }

    if (path === "/api/leaderboard/today") {
      if (request.method === "GET") {
        try {
          const board = await dailyLeaderboard(env, puzzle).getBoard(playerIdFromRequest(request));
          return json({ date: puzzle.date, ...board });
        } catch {
          return json({ error: "Leaderboard temporarily unavailable" }, 503);
        }
      }
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (request.headers.get("origin") !== url.origin) {
        return json({ error: "Score submissions must come from ContextAI" }, 403);
      }
      if (!(await rateLimitPassed(env.LEADERBOARD_RATE_LIMIT, `post:${clientIp(request)}`))) {
        return json({ error: "Please wait before submitting another score" }, 429);
      }
      const playerId = playerIdFromRequest(request);
      if (!playerId) return json({ error: "Your player session is missing. Refresh and try again." }, 401);
      try {
        const board = await dailyLeaderboard(env, puzzle).submitScore(playerId, Date.now());
        if (!board) {
          return json({ error: "This session has no server-verified solve to submit" }, 409);
        }
        return json({ date: puzzle.date, ...board });
      } catch {
        return json({ error: "Score submission temporarily unavailable" }, 503);
      }
    }

    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);

    const match = path.match(/^\/(?:api\/)?check\/([^/]+)$/);
    if (!match) return json({ error: "Not found" }, 404);

    if (url.searchParams.has("puzzle") && url.searchParams.get("puzzle") !== puzzle.id) {
      return json({ error: "A new daily puzzle has started", ...data }, 409);
    }

    const word = match[1].trim().toLowerCase();
    if (!/^[a-z]{2,20}$/.test(word)) {
      return json({ error: "Enter one word using letters A–Z" }, 400);
    }

    if (!(await rateLimitPassed(env.GUESS_RATE_LIMIT, `guess:${clientIp(request)}`))) {
      return json({ error: "Too many guesses from this network. Try again in a minute." }, 429);
    }

    let boardStub = null;
    let participant = null;
    try {
      boardStub = dailyLeaderboard(env, puzzle);
      const existingId = playerIdFromRequest(request);
      participant = existingId ? await boardStub.findPlayer(existingId) : null;
    } catch {
      boardStub = null;
      participant = null;
    }

    const wordIndex = vocabularyIndex.get(word);
    if (wordIndex === undefined) {
      return json(
        { word, rank: -1, status: "word not found", ...data, playerAlias: participant?.alias || null },
      );
    }

    try {
      const object = await env.RANKINGS.get(rankingKey(puzzle.index));
      if (!object || object.size !== expectedRankingBytes) return unavailable(puzzle);

      const buffer = await object.arrayBuffer();
      if (buffer.byteLength !== expectedRankingBytes) return unavailable(puzzle);

      const rank = new DataView(buffer).getUint16(wordIndex * 2, true);
      const status = rank === 1 ? "correct" : rank > 0 ? "try again" : "word not found";
      if (rank > 0 && participant && boardStub) {
        try {
          await boardStub.recordGuess(participant.playerId, word, rank, Date.now());
        } catch {
          // Keep the game available if the optional public leaderboard is down.
        }
      }
      return json(
        { word, rank, status, ...data, playerAlias: participant?.alias || null },
      );
    } catch {
      return unavailable(puzzle);
    }
  },
};

export class DailyLeaderboard extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS players (
        player_id TEXT PRIMARY KEY,
        alias TEXT NOT NULL UNIQUE,
        guess_count INTEGER NOT NULL DEFAULT 0,
        first_guess_at INTEGER,
        solved_at INTEGER,
        submitted_at INTEGER
      )
    `);
    this.ctx.storage.sql.exec(`
      CREATE INDEX IF NOT EXISTS players_leaderboard_order
      ON players (submitted_at, guess_count, solved_at)
    `);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS player_guesses (
        player_id TEXT NOT NULL,
        word TEXT NOT NULL,
        rank INTEGER NOT NULL,
        guessed_at INTEGER NOT NULL,
        PRIMARY KEY (player_id, word)
      )
    `);
  }

  async createPlayer() {
    const playerId = crypto.randomUUID();
    const alias = `Guest-${playerId.replaceAll("-", "").slice(0, 12).toUpperCase()}`;
    this.ctx.storage.sql.exec(
      "INSERT INTO players (player_id, alias) VALUES (?, ?)",
      playerId,
      alias,
    );
    return { playerId, alias };
  }

  async findPlayer(playerId) {
    if (!/^[0-9a-f-]{36}$/i.test(playerId || "")) return null;
    const row = this.ctx.storage.sql
      .exec("SELECT player_id, alias FROM players WHERE player_id = ?", playerId)
      .toArray()[0];
    return row ? { playerId: row.player_id, alias: row.alias } : null;
  }

  async recordGuess(playerId, word, rank, guessedAt) {
    if (!/^[a-z]{2,20}$/.test(word || "") || !Number.isInteger(rank) || rank < 1 || !Number.isFinite(guessedAt)) return false;
    const player = this.ctx.storage.sql
      .exec("SELECT solved_at FROM players WHERE player_id = ?", playerId)
      .toArray()[0];
    if (!player || player.solved_at != null) return false;
    const duplicate = this.ctx.storage.sql
      .exec("SELECT 1 AS found FROM player_guesses WHERE player_id = ? AND word = ?", playerId, word)
      .toArray()[0];
    if (duplicate) return true;
    this.ctx.storage.sql.exec(
      "INSERT INTO player_guesses (player_id, word, rank, guessed_at) VALUES (?, ?, ?, ?)",
      playerId,
      word,
      rank,
      guessedAt,
    );
    this.ctx.storage.sql.exec(
      `UPDATE players
       SET guess_count = guess_count + 1,
           first_guess_at = COALESCE(first_guess_at, ?),
           solved_at = CASE WHEN ? = 1 THEN ? ELSE solved_at END
       WHERE player_id = ? AND solved_at IS NULL`,
      guessedAt,
      rank === 1 ? 1 : 0,
      guessedAt,
      playerId,
    );
    return true;
  }

  async getBoard(playerId = null) {
    const entries = this.ctx.storage.sql
      .exec(`
        SELECT alias, guess_count AS guesses,
               MAX(0, solved_at - first_guess_at) AS duration_ms
        FROM players
        WHERE submitted_at IS NOT NULL
        ORDER BY guess_count ASC, (solved_at - first_guess_at) ASC, submitted_at ASC, alias ASC
        LIMIT 25
      `)
      .toArray()
      .map(({ duration_ms, ...entry }, index) => ({
        position: index + 1,
        ...entry,
        seconds: Math.floor(duration_ms / 1000),
      }));

    let currentPlayer = null;
    let myEntry = null;
    if (playerId) {
      currentPlayer = this.ctx.storage.sql
        .exec(
          `SELECT player_id, alias, guess_count AS guesses,
                  MAX(0, solved_at - first_guess_at) AS duration_ms,
                  solved_at, submitted_at
           FROM players WHERE player_id = ?`,
          playerId,
        )
        .toArray()[0] || null;
    }

    if (currentPlayer?.submitted_at != null) {
      const ahead = this.ctx.storage.sql
        .exec(
          `SELECT COUNT(*) AS count FROM players
           WHERE submitted_at IS NOT NULL AND (
             guess_count < ? OR
             (guess_count = ? AND (solved_at - first_guess_at) < ?) OR
             (guess_count = ? AND (solved_at - first_guess_at) = ? AND submitted_at < ?) OR
             (guess_count = ? AND (solved_at - first_guess_at) = ? AND submitted_at = ? AND alias < ?)
           )`,
          currentPlayer.guesses,
          currentPlayer.guesses,
          currentPlayer.duration_ms,
          currentPlayer.guesses,
          currentPlayer.duration_ms,
          currentPlayer.submitted_at,
          currentPlayer.guesses,
          currentPlayer.duration_ms,
          currentPlayer.submitted_at,
          currentPlayer.alias,
        )
        .one().count;
      myEntry = {
        position: ahead + 1,
        alias: currentPlayer.alias,
        guesses: currentPlayer.guesses,
        seconds: Math.floor(currentPlayer.duration_ms / 1000),
      };
    }

    return {
      entries,
      myEntry,
      playerAlias: currentPlayer?.alias || null,
      canSubmit: Boolean(currentPlayer?.solved_at && currentPlayer.submitted_at == null),
    };
  }

  async submitScore(playerId, submittedAt) {
    const player = this.ctx.storage.sql
      .exec("SELECT solved_at FROM players WHERE player_id = ?", playerId)
      .toArray()[0];
    if (!player?.solved_at) return null;

    this.ctx.storage.sql.exec(
      "UPDATE players SET submitted_at = COALESCE(submitted_at, ?) WHERE player_id = ? AND solved_at IS NOT NULL",
      submittedAt,
      playerId,
    );
    return this.getBoard(playerId);
  }
}
