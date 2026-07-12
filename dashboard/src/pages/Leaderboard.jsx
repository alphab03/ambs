import { useEffect, useState } from "react";
import { api } from "../api/client.js";

export default function Leaderboard() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.leaderboard().then(setRows).catch(console.error);
  }, []);

  return (
    <div className="card">
      <h2>Prediction accuracy</h2>
      {rows.length === 0 && <p style={{ color: "var(--text-dim)" }}>No predictions scored yet.</p>}
      {rows.map((r) => (
        <div className="leaderboard-row" key={r.userId}>
          <span>{r.name}</span>
          <span>
            {Math.round((r.accuracy || 0) * 100)}% ({r.correctPredictions}/{r.totalPredictions})
          </span>
        </div>
      ))}
    </div>
  );
}
