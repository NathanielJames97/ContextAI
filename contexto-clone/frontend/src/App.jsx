import { useState } from "react";
import axios from "axios";

function App() {
  const [guess, setGuess] = useState("");
  const [response, setResponse] = useState(null);

  const checkWord = async () => {
    if (!guess.trim()) return;
    try {
      const res = await axios.get(`https://contextai-production-8a5a.up.railway.app/check/${guess}`);
      setResponse(res.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      setResponse({ status: "Error fetching data" });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white shadow-lg p-6 rounded-lg max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Contexto Game</h1>
      <input
        type="text"
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
        placeholder="Enter a word"
        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <button
        onClick={checkWord}
        className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition"
      >
        Submit
      </button>

      {response && (
        <div className="mt-4 w-full bg-gray-100 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Result:</h3>
          <p className="text-gray-700"><strong>Word:</strong> {response.word}</p>
          <p className="text-gray-700"><strong>Rank:</strong> {response.rank}</p>
          <p className={`font-bold ${response.status === "correct" ? "text-green-500" : "text-red-500"}`}>
            {response.status}
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
