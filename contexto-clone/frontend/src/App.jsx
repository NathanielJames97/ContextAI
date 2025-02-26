import { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";

function App() {
  const [guess, setGuess] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [guessCount, setGuessCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [dailyWord, setDailyWord] = useState(null);

  useEffect(() => {
    const fetchDailyWord = async () => {
      try {
        const res = await axios.get("https://contextai-production-8a5a.up.railway.app/daily-word");
        setDailyWord(res.data.word);
      } catch (error) {
        console.error("Error fetching daily word:", error);
      }
    };
    fetchDailyWord();
  }, []);

  const checkWord = async () => {
    if (!guess.trim() || gameOver) return;
    setLoading(true);
    setGuessCount((prev) => prev + 1);

    try {
      const res = await axios.get(`https://contextai-production-8a5a.up.railway.app/check/${guess}`);
      setResponse(res.data);

      if (res.data.rank > 0) {
        setLeaderboard((prev) =>
          [...prev, res.data].sort((a, b) => a.rank - b.rank).slice(0, 10)
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-purple-900 to-blue-700 text-white p-6">
      <motion.h1 
        className="text-5xl font-bold tracking-wide mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        🔎 Contexto Game - Daily Challenge
      </motion.h1>

      <p className="text-xl font-semibold mb-4">Guesses: {guessCount}</p>

      {gameOver ? (
        <div className="bg-green-700 p-6 rounded-lg shadow-lg text-center max-w-lg">
          <h2 className="text-3xl font-bold mb-4">🎉 Congratulations! 🎉</h2>
          <p className="text-lg">You found the daily word in {guessCount} guesses!</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition"
          >
            🔄 Play Again
          </button>
        </div>
      ) : (
        <div className="bg-gray-900 p-8 rounded-lg shadow-lg max-w-lg text-center">
          <p className="mb-4 text-xl font-semibold">Daily Challenge Mode 🌟</p>
          <motion.input
            type="text"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && checkWord()}
            placeholder="Enter a word..."
            className="w-full p-3 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <motion.button
            onClick={checkWord}
            className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg"
          >
            {loading ? "Checking..." : "🔍 Submit"}
          </motion.button>
        </div>
      )}
    </div>
  );
}

export default App;