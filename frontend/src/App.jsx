import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";

const STATS_KEY = "contextai-stats-v1";

function readStoredJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function saveStoredJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The game still works when browser storage is unavailable or full.
  }
}

function readToday() {
  return new Date().toISOString().slice(0, 10);
}

function dateDistance(first, second) {
  const firstTime = Date.parse(`${first}T00:00:00Z`);
  const secondTime = Date.parse(`${second}T00:00:00Z`);
  return Math.round((secondTime - firstTime) / 86_400_000);
}

function getStreakSummary(stats, today) {
  const solvedDates = Object.entries(stats)
    .filter(([, result]) => result?.solved)
    .map(([date]) => date)
    .sort();

  let best = 0;
  let run = 0;
  let previous = null;
  for (const date of solvedDates) {
    run = previous && dateDistance(previous, date) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }

  let current = 0;
  let expected = solvedDates.at(-1);
  if (expected && dateDistance(expected, today) >= 0 && dateDistance(expected, today) <= 1) {
    for (let index = solvedDates.length - 1; index >= 0; index -= 1) {
      if (solvedDates[index] !== expected) break;
      current += 1;
      const previousDate = new Date(`${expected}T00:00:00Z`);
      previousDate.setUTCDate(previousDate.getUTCDate() - 1);
      expected = previousDate.toISOString().slice(0, 10);
    }
  }

  return {
    played: Object.values(stats).filter((result) => result?.played).length,
    solved: solvedDates.length,
    current,
    best,
  };
}

function rankLabel(rank) {
  if (rank === 1) return "The answer";
  if (rank <= 10) return "Very close";
  if (rank <= 100) return "Close";
  if (rank <= 1000) return "Warm";
  return "Getting warmer";
}

function rankColor(rank) {
  if (rank <= 10) return "rank-meter--hot";
  if (rank <= 100) return "rank-meter--close";
  if (rank <= 1000) return "rank-meter--warm";
  return "rank-meter--cool";
}

function rankComparison(rank, previousBestRank) {
  if (previousBestRank == null) return "First ranked guess of the day.";
  if (rank < previousBestRank) {
    return `New best — up ${(previousBestRank - rank).toLocaleString()} places.`;
  }
  if (rank === previousBestRank) return `Tied your best rank of #${previousBestRank.toLocaleString()}.`;
  return `Best remains #${previousBestRank.toLocaleString()} — down ${(rank - previousBestRank).toLocaleString()} places.`;
}

function getMasterySummary(stats) {
  const days = Object.entries(stats)
    .filter(([, result]) => result?.played)
    .sort(([first], [second]) => first.localeCompare(second));
  const bestRank = days.reduce(
    (best, [, result]) => Number.isFinite(result.bestRank) ? Math.min(best, result.bestRank) : best,
    Infinity,
  );
  const solvedDays = days.filter(([, result]) => result.solved && Number.isFinite(result.guesses));
  const averageSolveGuesses = solvedDays.length
    ? solvedDays.reduce((total, [, result]) => total + result.guesses, 0) / solvedDays.length
    : null;

  return {
    bestRank: Number.isFinite(bestRank) ? bestRank : null,
    averageSolveGuesses,
    played: days.length,
    recent: days.slice(-7).reverse(),
  };
}

function formatPuzzleDay(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatSolveTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function shareGrid(guesses) {
  return guesses
    .map(({ rank }) => (rank <= 10 ? "🟩" : rank <= 100 ? "🟨" : rank <= 1000 ? "🟧" : "⬜"))
    .join("");
}

function App() {
  const guessInputRef = useRef(null);
  const [guess, setGuess] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [guesses, setGuesses] = useState([]);
  const [displayedGuesses, setDisplayedGuesses] = useState(10);
  const [guessCount, setGuessCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [puzzleDate, setPuzzleDate] = useState(null);
  const [puzzleStatus, setPuzzleStatus] = useState("loading");
  const [stats, setStats] = useState(() => readStoredJson(STATS_KEY, {}));
  const [shareMessage, setShareMessage] = useState("");
  const [leaderboard, setLeaderboard] = useState({ entries: [], myEntry: null, canSubmit: false });
  const [leaderboardStatus, setLeaderboardStatus] = useState("loading");
  const [leaderboardPosting, setLeaderboardPosting] = useState(false);
  const [leaderboardMessage, setLeaderboardMessage] = useState("");
  const [playerAlias, setPlayerAlias] = useState(null);

  const streakSummary = useMemo(
    () => getStreakSummary(stats, puzzleDate || readToday()),
    [stats, puzzleDate]
  );
  const masterySummary = useMemo(() => getMasterySummary(stats), [stats]);

  const loadLeaderboard = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/leaderboard/today");
      setLeaderboard(data);
      if (data.playerAlias) setPlayerAlias(data.playerAlias);
      setLeaderboardStatus("ready");
    } catch {
      setLeaderboardStatus("error");
    }
  }, []);

  const postLeaderboardScore = async () => {
    setLeaderboardPosting(true);
    setLeaderboardMessage("");
    try {
      const { data } = await axios.post("/api/leaderboard/today");
      setLeaderboard(data);
      setLeaderboardStatus("ready");
      setLeaderboardMessage(`Posted as ${data.myEntry.alias} at #${data.myEntry.position}.`);
    } catch (error) {
      setLeaderboardMessage(error.response?.data?.error || "Score submission failed.");
    } finally {
      setLeaderboardPosting(false);
    }
  };

  const loadPuzzle = useCallback(async () => {
    setPuzzleStatus("loading");
    setResponse(null);
    try {
      const { data } = await axios.get("/api/today");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
        throw new Error("The puzzle date was missing.");
      }

      const saved = readStoredJson(`contextai-game-${data.date}`, {});
      const savedGuesses = Array.isArray(saved.guesses)
        ? saved.guesses.filter(
            (entry) =>
              entry &&
              typeof entry.word === "string" &&
              Number.isFinite(entry.rank) &&
              entry.rank > 0
          )
        : [];
      if (savedGuesses.length > 0) {
        const savedBestRank = savedGuesses.reduce((best, entry) => Math.min(best, entry.rank), Infinity);
        setStats((currentStats) => {
          const existing = currentStats[data.date] || {};
          const bestRank = Math.min(
            Number.isFinite(existing.bestRank) ? existing.bestRank : Infinity,
            savedBestRank,
          );
          return {
            ...currentStats,
            [data.date]: {
              ...existing,
              played: true,
              solved: existing.solved === true || saved.gameOver === true,
              guesses: Math.max(Number(existing.guesses) || 0, Number(saved.guessCount) || 0),
              bestRank,
            },
          };
        });
      }
      setPuzzleDate(data.date);
      setGuesses(savedGuesses);
      setGuessCount(Number(saved.guessCount) || 0);
      setGameOver(saved.gameOver === true);
      setDisplayedGuesses(10);
      if (saved.gameOver) {
        const winningGuess = savedGuesses.find((entry) => entry.rank === 1);
        setResponse({
          kind: "correct",
          word: saved.solvedWord || winningGuess?.word,
          rank: 1,
        });
      }
      try {
        const { data: session } = await axios.post("/api/leaderboard/session");
        setPlayerAlias(session.playerAlias);
      } catch {
        setPlayerAlias(null);
      }
      setPuzzleStatus("ready");
    } catch (error) {
      const notReady = error.response?.status === 503;
      setPuzzleStatus(notReady ? "not-ready" : "error");
    }
  }, []);

  useEffect(() => {
    loadPuzzle();
  }, [loadPuzzle]);

  useEffect(() => {
    if (puzzleStatus === "ready") loadLeaderboard();
  }, [loadLeaderboard, puzzleStatus]);

  useEffect(() => {
    if (puzzleStatus === "ready" && !loading && !gameOver) {
      guessInputRef.current?.focus();
    }
  }, [gameOver, loading, puzzleStatus, response]);

  useEffect(() => {
    saveStoredJson(STATS_KEY, stats);
  }, [stats]);

  useEffect(() => {
    if (!puzzleDate || puzzleStatus !== "ready") return;
    saveStoredJson(`contextai-game-${puzzleDate}`, {
      guesses,
      guessCount,
      gameOver,
      solvedWord: gameOver ? guesses.find((entry) => entry.rank === 1)?.word : null,
    });
  }, [guesses, guessCount, gameOver, puzzleDate, puzzleStatus]);

  const checkWord = async (event) => {
    event.preventDefault();
    const word = guess.trim().toLowerCase();
    if (!word || loading || gameOver || puzzleStatus !== "ready") return;

    if (guesses.some((entry) => entry.word.toLowerCase() === word)) {
      setResponse({ kind: "duplicate", word });
      return;
    }

    setLoading(true);
    setResponse(null);
    try {
      const { data } = await axios.get(`/api/check/${encodeURIComponent(word)}`);
      if (data.playerAlias) setPlayerAlias(data.playerAlias);
      if (!Number.isFinite(data.rank) || data.rank <= 0) {
        setResponse({ kind: "unknown", word });
        return;
      }

      const previousBestRank = guesses.length
        ? guesses.reduce((best, entry) => Math.min(best, entry.rank), Infinity)
        : null;
      const nextGuesses = [...guesses, data].sort((a, b) => a.rank - b.rank);
      const nextGuessCount = guessCount + 1;
      const solved = data.status === "correct";
      setGuesses(nextGuesses);
      setGuessCount(nextGuessCount);
      setGameOver(solved);
      setGuess("");
      setResponse({ kind: solved ? "correct" : "rank", previousBestRank, ...data });

      const nextStats = {
        ...stats,
        [puzzleDate]: {
          played: true,
          solved: solved || stats[puzzleDate]?.solved === true,
          guesses: nextGuessCount,
          bestRank: Math.min(stats[puzzleDate]?.bestRank || Infinity, data.rank),
        },
      };
      setStats(nextStats);
      if (solved) void loadLeaderboard();
    } catch {
      setResponse({ kind: "network-error" });
    } finally {
      setLoading(false);
    }
  };

  const shareResult = async () => {
    if (!puzzleDate || !gameOver) return;
    const text = [
      `ContextAI · ${puzzleDate}`,
      `Solved in ${guessCount} ${guessCount === 1 ? "guess" : "guesses"}`,
      shareGrid(guesses),
      `Can you find today's word? ${window.location.origin}`,
    ].join("\n");

    try {
      if (navigator.share) {
        await navigator.share({ title: "ContextAI", text });
        setShareMessage("Share sheet opened.");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setShareMessage("Spoiler-free result copied.");
      } else {
        setShareMessage("Sharing is unavailable in this browser.");
      }
    } catch (error) {
      if (error.name !== "AbortError") setShareMessage("Could not share just now. Try again.");
    }
  };

  const formattedDate = puzzleDate
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "full",
        timeZone: "UTC",
      }).format(new Date(`${puzzleDate}T00:00:00Z`))
    : "Your daily puzzle";

  const visibleGuesses = guesses.slice(0, displayedGuesses);

  return (
    <main className="app-shell">
      <div className="app-glow app-glow--one" aria-hidden="true" />
      <div className="app-glow app-glow--two" aria-hidden="true" />
      <div className="game-layout">
        <header className="brand-row">
          <a className="brand" href="/" aria-label="ContextAI home">
            <span className="brand-mark" aria-hidden="true">C</span>
            <span>Context<span className="brand-accent">AI</span></span>
          </a>
        </header>

        <div className="play-layout">
        <section className="hero-card" aria-labelledby="game-title">
          <div className="hero-copy">
            <p className="eyebrow">{formattedDate}</p>
            <h1 id="game-title">Find the word.<br /><span>Follow the meaning.</span></h1>
            <p className="intro-copy">
              Guess a word and see how closely its meaning matches today’s secret word.
              The closer you are, the smaller your rank.
            </p>
          </div>

          <div className="how-to-play" aria-label="How to play">
            <div className="how-to-play__icon" aria-hidden="true">↘</div>
            <div>
              <strong>Lower rank = closer meaning</strong>
              <p>Rank 1 is the answer. Keep guessing as often as you like.</p>
            </div>
          </div>

          <div className="guess-panel">
            <div className="guess-panel__heading">
              <div>
                <p className="eyebrow">YOUR DAILY CHALLENGE</p>
                <h2>What’s your first guess?</h2>
              </div>
              <div className="guess-counter" aria-label={`${guessCount} valid guesses`}>
                <strong>{guessCount}</strong><span>guesses</span>
              </div>
            </div>

            {puzzleStatus === "loading" && (
              <div className="notice notice--loading" role="status">Loading today’s puzzle…</div>
            )}
            {(puzzleStatus === "not-ready" || puzzleStatus === "error") && (
              <div className="notice notice--error" role="alert">
                <div>
                  <strong>{puzzleStatus === "not-ready" ? "Today’s word is on its way." : "We couldn’t load the puzzle."}</strong>
                  <p>{puzzleStatus === "not-ready" ? "The daily puzzle has not been published yet. Please try again soon." : "Check your connection, then try loading it again."}</p>
                </div>
                <button className="button button--quiet" type="button" onClick={loadPuzzle}>Try again</button>
              </div>
            )}

            <form className="guess-form" onSubmit={checkWord}>
              <label className="sr-only" htmlFor="guess-input">Your word guess</label>
              <input
                ref={guessInputRef}
                id="guess-input"
                type="text"
                value={guess}
                onChange={(event) => {
                  setGuess(event.target.value);
                  setResponse(null);
                  setShareMessage("");
                }}
                placeholder="Type any word…"
                autoComplete="off"
                maxLength={64}
                disabled={puzzleStatus !== "ready" || loading || gameOver}
                aria-describedby="guess-help"
              />
              <button
                className="button button--primary"
                type="submit"
                disabled={!guess.trim() || puzzleStatus !== "ready" || loading || gameOver}
              >
                {loading ? <><span className="button-spinner" aria-hidden="true" /> Checking…</> : "Check word"}
              </button>
            </form>
            <p id="guess-help" className="input-help">Press Enter to check · Your progress stays on this device</p>

            {response && (
              <motion.div
                className={`feedback feedback--${response.kind}`}
                role="status"
                aria-live="polite"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {response.kind === "correct" && <><strong>You found it{response.word ? `: ${response.word}` : ""}!</strong><span>Solved in {guessCount} {guessCount === 1 ? "guess" : "guesses"}. A new word arrives at midnight UTC.</span></>}
                {response.kind === "rank" && <><strong>{response.word} <span className="feedback-rank">#{response.rank}</span></strong><span>{rankComparison(response.rank, response.previousBestRank)}</span><span>{rankLabel(response.rank)} — try a related idea.</span></>}
                {response.kind === "unknown" && <><strong>We couldn’t find “{response.word}”.</strong><span>Check the spelling or try another word.</span></>}
                {response.kind === "duplicate" && <><strong>You already tried “{response.word}”.</strong><span>Try a different word and explore a new meaning.</span></>}
                {response.kind === "network-error" && <><strong>That guess didn’t reach the game.</strong><span>Your guess was not counted. Check your connection and try again.</span></>}
              </motion.div>
            )}

            {gameOver && (
              <div className="win-actions">
                <button className="button button--share" type="button" onClick={shareResult}>Share spoiler-free result</button>
                {shareMessage && <span className="share-message" role="status">{shareMessage}</span>}
                {leaderboard.canSubmit && (
                  <button className="button button--leaderboard" type="button" onClick={postLeaderboardScore} disabled={leaderboardPosting}>
                    {leaderboardPosting ? "Posting score…" : `Post to today’s board as ${playerAlias || "Guest"}`}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="guesses-section" aria-labelledby="guesses-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">SEMANTIC TRAIL</p>
              <h2 id="guesses-title">Your guesses</h2>
            </div>
            <span className="guess-total">{guesses.length} {guesses.length === 1 ? "word" : "words"}</span>
          </div>

          {guesses.length === 0 ? (
            <div className="empty-trail">
              <span aria-hidden="true">✳</span>
              <strong>Your trail starts with one word.</strong>
              <p>Try something broad, then follow the closest meanings.</p>
            </div>
          ) : (
            <ol className="guess-list" aria-label="Guesses ordered from closest to furthest">
              {visibleGuesses.map((entry, index) => (
                <li className="guess-row" key={`${entry.word}-${entry.rank}`}>
                  <span className="guess-position">{String(index + 1).padStart(2, "0")}</span>
                  <span className="guess-word">{entry.word}</span>
                  <div className="rank-track" aria-hidden="true">
                    <span className={`rank-meter ${rankColor(entry.rank)}`} style={{ width: `${entry.rank <= 10 ? 94 : entry.rank <= 100 ? 76 : entry.rank <= 1000 ? 54 : 30}%` }} />
                  </div>
                  <span className="rank-value">#{entry.rank}</span>
                  <span className="rank-description">{rankLabel(entry.rank)}</span>
                </li>
              ))}
            </ol>
          )}

          {guesses.length > displayedGuesses && (
            <button className="button button--quiet show-more" type="button" onClick={() => setDisplayedGuesses((count) => count + 10)}>
              Show more guesses
            </button>
          )}
        </section>
        </div>

        <section className="stats-strip" aria-label="Your progress on this device">
          <div><strong>{streakSummary.current}</strong><span>day streak</span></div>
          <div><strong>{streakSummary.best}</strong><span>best streak</span></div>
          <div><strong>{streakSummary.solved}</strong><span>solved</span></div>
          <div><strong>{streakSummary.played}</strong><span>played</span></div>
          <p>Saved on this device</p>
        </section>

        <section className="mastery-section" aria-labelledby="mastery-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">PRIVATE RECORD</p>
              <h2 id="mastery-title">Mastery</h2>
            </div>
            <span className="mastery-private-note">Saved on this device</span>
          </div>
          <div className="mastery-overview">
            <div><strong>{masterySummary.bestRank ? `#${masterySummary.bestRank.toLocaleString()}` : "—"}</strong><span>personal best rank</span></div>
            <div><strong>{masterySummary.averageSolveGuesses == null ? "—" : masterySummary.averageSolveGuesses.toFixed(1)}</strong><span>avg. guesses to solve</span></div>
            <div><strong>{masterySummary.played}</strong><span>puzzles played</span></div>
          </div>
          {masterySummary.recent.length > 0 ? (
            <ol className="mastery-history" aria-label="Recent daily results">
              {masterySummary.recent.map(([date, result]) => (
                <li key={date}>
                  <time dateTime={date}>{formatPuzzleDay(date)}</time>
                  <span>{Number.isFinite(result.bestRank) ? `Best #${result.bestRank.toLocaleString()}` : "No rank recorded"}</span>
                  <span>{result.solved ? `Solved in ${result.guesses}` : "Unsolved"}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mastery-empty">Your daily record will appear here after your first ranked guess.</p>
          )}
        </section>

        <section className="leaderboard-section" aria-labelledby="leaderboard-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">TODAY’S FIELD</p>
              <h2 id="leaderboard-title">Daily leaderboard</h2>
            </div>
            <span className="leaderboard-rule">Fewest guesses · fastest tie-break</span>
          </div>
          <p className="leaderboard-privacy">Posting is optional. Scores appear publicly under a generated guest tag.</p>
          {leaderboardStatus === "loading" ? (
            <p className="leaderboard-empty" role="status">Loading today’s scores…</p>
          ) : leaderboardStatus === "error" ? (
            <p className="leaderboard-empty" role="status">Today’s leaderboard is unavailable.</p>
          ) : leaderboard.entries.length === 0 ? (
            <p className="leaderboard-empty">No scores posted yet.</p>
          ) : (
            <ol className="leaderboard-list" aria-label="Top daily scores">
              {leaderboard.entries.map((entry) => (
                <li className={`leaderboard-row${entry.alias === playerAlias ? " leaderboard-row--self" : ""}`} key={entry.alias}>
                  <span className="leaderboard-position">#{entry.position}</span>
                  <span className="leaderboard-alias">{entry.alias}</span>
                  <span className="leaderboard-guesses">{entry.guesses} {entry.guesses === 1 ? "guess" : "guesses"}</span>
                  <span className="leaderboard-time">{formatSolveTime(entry.seconds)}</span>
                </li>
              ))}
            </ol>
          )}
          {leaderboard.myEntry && leaderboard.myEntry.position > leaderboard.entries.length && (
            <div className="leaderboard-row leaderboard-row--self leaderboard-own-row">
              <span className="leaderboard-position">#{leaderboard.myEntry.position}</span>
              <span className="leaderboard-alias">{leaderboard.myEntry.alias} · you</span>
              <span className="leaderboard-guesses">{leaderboard.myEntry.guesses} {leaderboard.myEntry.guesses === 1 ? "guess" : "guesses"}</span>
              <span className="leaderboard-time">{formatSolveTime(leaderboard.myEntry.seconds)}</span>
            </div>
          )}
          {leaderboard.myEntry && leaderboard.myEntry.position <= leaderboard.entries.length && (
            <p className="leaderboard-personal-rank">Your score: #{leaderboard.myEntry.position}</p>
          )}
          {gameOver && !leaderboard.canSubmit && !leaderboard.myEntry && (
            <p className="leaderboard-empty">This solve was not recorded by today’s leaderboard.</p>
          )}
          {leaderboardMessage && <p className="leaderboard-message" role="status">{leaderboardMessage}</p>}
        </section>

        <footer className="footer-note">
          <span>One new word every day</span><span aria-hidden="true">·</span><span>Reset at 00:00 UTC</span>
        </footer>
      </div>
    </main>
  );
}

export default App;
