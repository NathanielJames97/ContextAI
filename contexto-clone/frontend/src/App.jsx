import { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";

function App() {
  const [guess, setGuess] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);

  const checkWord = async () => {
    if (!guess.trim()) return;
    setLoading(true);
    
    try {
      const res = await axios.get(`https://contextai-production-8a5a.up.railway.app/check/${guess}`);
      setResponse(res.data);
  
      // Add the new guess to the leaderboard
      if (res.data.rank > 0) {
        setLeaderboard((prev) => [...prev, res.data].slice(-10)); // Keep only last 10 guesses
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setResponse({ status: "Error fetching data" });
    }
  
    setGuess(""); // ✅ Clear input after submission
    setLoading(false);
  };
  

  // Function to get bar color based on ranking
  const getBarColor = (rank) => {
    if (rank <= 100) return "bg-green-500"; // Very close
    if (rank <= 1000) return "bg-yellow-400"; // Mid-range
    return "bg-red-500"; // Far away
  };

  // Function to get bar width based on ranking (normalized to max 100%)
  const getBarWidth = (rank) => {
    return `${Math.max(5, 100 - rank / 10)}%`; // Prevents bars from disappearing
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-purple-900 to-blue-700 text-white p-6">
      {/* Game Title */}
      <motion.h1 
        className="text-5xl font-bold tracking-wide mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        🔎 Contexto Game
      </motion.h1>

      {/* Game Panel */}
      <div className="bg-gray-900 p-8 rounded-lg shadow-lg max-w-lg text-center">
      <motion.input
  type="text"
  value={guess}
  onChange={(e) => setGuess(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // ✅ Prevent unintended behavior when clearing input
      checkWord();
    }
  }}
  placeholder="Enter a word..."
  className="w-full p-3 text-black text-lg rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
  whileFocus={{ scale: 1.05 }}
/>



        <motion.button
          onClick={checkWord}
          className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {loading ? "Checking..." : "🔍 Submit"}
        </motion.button>

        {response && (
          <motion.div 
            className="mt-6 p-4 rounded-lg shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ 
              backgroundColor: response.status === "correct" ? "#22c55e" : response.status === "try again" ? "#facc15" : "#ef4444"
            }}
          >
            <h3 className="text-2xl font-bold">🎯 Result:</h3>
            <p className="text-xl"><strong>Word:</strong> {response.word}</p>
            <p className="text-xl"><strong>Rank:</strong> {response.rank}</p>
            <p className={`font-bold text-2xl mt-2 ${response.status === "correct" ? "text-green-900" : response.status === "try again" ? "text-yellow-900" : "text-red-900"}`}>
              {response.status}
            </p>
          </motion.div>
        )}
      </div>

      {/* Leaderboard Section */}
      <div className="mt-8 w-full max-w-lg">
        <h2 className="text-3xl font-bold mb-4 text-center">📜 Leaderboard</h2>
        <div className="space-y-2">
          {leaderboard.map((entry, index) => (
            <div key={index} className="flex items-center space-x-3">
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
