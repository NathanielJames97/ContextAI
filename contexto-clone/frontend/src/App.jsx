import { useState } from "react";
import axios from "axios";

function App() {
  const [guess, setGuess] = useState("");
  const [response, setResponse] = useState(null);

  const checkWord = async () => {
    try {
      const res = await axios.get(`https://contextai-production-8a5a.up.railway.app/check/${guess}`);
      setResponse(res.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      setResponse({ status: "Error fetching data" });
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Contexto Game</h1>
      <input
        type="text"
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
        placeholder="Enter a word"
      />
      <button onClick={checkWord}>Submit</button>
      {response && (
        <div>
          <h3>Result:</h3>
          <p>Word: {response.word}</p>
          <p>Rank: {response.rank}</p>
          <p>Status: {response.status}</p>
        </div>
      )}
    </div>
  );
}

export default App;
