import manifest from "./manifest.json";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

const vocabularyIndex = new Map(
  manifest.vocabulary.map((word, index) => [word, index]),
);
const expectedRankingBytes = manifest.vocabulary.length * Uint16Array.BYTES_PER_ELEMENT;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
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
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);

    const puzzle = puzzleFor();
    const data = publicPuzzle(puzzle);

    if (path === "/api/health") {
      return json({ status: "ok", engine: manifest.model });
    }

    if (path === "/api/today") {
      try {
        const object = await env.RANKINGS.head(rankingKey(puzzle.index));
        if (!object || object.size !== expectedRankingBytes) return unavailable(puzzle);
        return json(data);
      } catch {
        return unavailable(puzzle);
      }
    }

    const match = path.match(/^\/(?:api\/)?check\/([^/]+)$/);
    if (!match) return json({ error: "Not found" }, 404);

    if (url.searchParams.has("puzzle") && url.searchParams.get("puzzle") !== puzzle.id) {
      return json({ error: "A new daily puzzle has started", ...data }, 409);
    }

    const word = match[1].trim().toLowerCase();
    if (!/^[a-z]{2,20}$/.test(word)) {
      return json({ error: "Enter one word using letters A–Z" }, 400);
    }

    const wordIndex = vocabularyIndex.get(word);
    if (wordIndex === undefined) {
      return json({ word, rank: -1, status: "word not found", ...data });
    }

    try {
      const object = await env.RANKINGS.get(rankingKey(puzzle.index));
      if (!object || object.size !== expectedRankingBytes) return unavailable(puzzle);

      const buffer = await object.arrayBuffer();
      if (buffer.byteLength !== expectedRankingBytes) return unavailable(puzzle);

      const rank = new DataView(buffer).getUint16(wordIndex * 2, true);
      const status = rank === 1 ? "correct" : rank > 0 ? "try again" : "word not found";
      return json({ word, rank, status, ...data });
    } catch {
      return unavailable(puzzle);
    }
  },
};
