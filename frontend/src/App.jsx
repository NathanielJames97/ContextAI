import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { motion } from "framer-motion";

function App() {
  const [guess, setGuess] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [displayedGuesses, setDisplayedGuesses] = useState(10); // Initial load amount
  const [guessCount, setGuessCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const leaderboardRef = useRef(null);

  useEffect(() => {
    const savedGuesses = JSON.parse(localStorage.getItem("leaderboard")) || [];
    const savedGuessCount = parseInt(localStorage.getItem("guessCount")) || 0;
    const savedGameOver = localStorage.getItem("gameOver") === "true";

    if (savedGuesses.length > 0) setLeaderboard(savedGuesses);
    if (savedGuessCount > 0) setGuessCount(savedGuessCount);
    setGameOver(savedGameOver);
  }, []);

  useEffect(() => {
    localStorage.setItem("leaderboard", JSON.stringify(leaderboard));
    localStorage.setItem("guessCount", guessCount.toString());
    localStorage.setItem("gameOver", gameOver.toString());
  }, [leaderboard, guessCount, gameOver]);

  const checkWord = async () => {
    if (!guess.trim() || gameOver) return;
    setLoading(true);
    setGuessCount((prev) => prev + 1);

    try {
      const res = await axios.get(
        `https://contextai-production-8a5a.up.railway.app/check/${guess}`
      );
      setResponse(res.data);

      if (res.data.rank > 0) {
        setLeaderboard((prev) =>
          [...prev, res.data].sort((a, b) => a.rank - b.rank)
        );
      }

      if (res.data.status === "correct") {
        setGameOver(true);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setResponse({ status: "Error fetching data" });
    }

    setGuess("");
    setLoading(false);
  };

  const startNewGame = () => {
    setGuess("");
    setResponse(null);
    setLeaderboard([]);
    setGuessCount(0);
    setGameOver(false);

    localStorage.removeItem("leaderboard");
    localStorage.removeItem("guessCount");
    localStorage.removeItem("gameOver");
  };

  const getBarColor = (rank) => {
    if (rank <= 100) return "bg-green-500";
    if (rank <= 1000) return "bg-yellow-400";
    return "bg-red-500";
  };

  const getBarWidth = (rank) => {
    return `${Math.max(5, 100 - rank / 10)}%`;
  };

  // Infinite Scroll Handler
  const handleScroll = useCallback(() => {
    if (!leaderboardRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = leaderboardRef.current;

    // Load more when the user reaches the bottom
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      setDisplayedGuesses((prev) => Math.min(prev + 10, leaderboard.length));
    }
  }, [leaderboard]);

  useEffect(() => {
    const currentRef = leaderboardRef.current;
    if (currentRef) {
      currentRef.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (currentRef) {
        currentRef.removeEventListener("scroll", handleScroll);
      }
    };
  }, [handleScroll]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-blue-800 to-gray-900 text-white p-6">
      {/* Title */}
      <motion.h1
        className="text-5xl font-bold tracking-wide mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        🔎 Contexto Game
      </motion.h1>

      {/* Guess Counter */}
      <p className="text-xl font-semibold mb-4">Guesses: {guessCount}</p>

      

      {/* Input & Submit Button */}
      <div className="bg-gray-900 p-8 rounded-lg shadow-lg max-w-lg text-center space-y-4">
        <motion.input
          type="text"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && checkWord()}
          placeholder="Enter a word..."
          className="w-full p-3 text-white text-lg rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          whileFocus={{ scale: 1.05 }}
        />

        <motion.button
          onClick={checkWord}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {loading ? "Checking..." : "🔍 Submit"}
        </motion.button>
      </div>

      {/* Guess Feedback Box */}
      {response && (
        <motion.div
          className="mt-6 p-4 rounded-lg shadow-lg text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            backgroundColor:
              response.status === "correct"
                ? "#22c55e"
                : response.status === "try again"
                ? "#facc15"
                : "#ef4444",
          }}
        >
          <h3 className="text-2xl font-bold">🎯 Result:</h3>
          <p className="text-xl">
            <strong>Word:</strong> {response.word}
          </p>
          <p className="text-xl">
            <strong>Rank:</strong> {response.rank}
          </p>
        </motion.div>
      )}

      {/* Leaderboard (Infinite Scroll) */}
      <div className="mt-8 w-full max-w-lg">
        <h2 className="text-3xl font-bold mb-4 text-center">📜 Leaderboard</h2>
        <div ref={leaderboardRef} className="space-y-3">
          {leaderboard.slice(0, displayedGuesses).map((entry, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-3 rounded-md transition hover:bg-gray-700 hover:shadow-md"
            >
              <p className="w-24 text-lg font-medium">{entry.word}</p>
              <div className="w-full bg-gray-700 rounded-full h-5">
                <div
                  className={`h-5 rounded-full ${getBarColor(entry.rank)}`}
                  style={{ width: getBarWidth(entry.rank) }}
                ></div>
              </div>
              <p className="w-12 text-right font-semibold">{entry.rank}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
