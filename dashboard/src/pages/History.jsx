import { useEffect, useState } from "react";
import DareCard from "../components/DareCard.jsx";
import { api } from "../api/client.js";

export default function History() {
  const [assignments, setAssignments] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.history().then(setAssignments).catch((err) => setError(err.message));
  }, []);

  if (error) return <p>{error}</p>;
  if (!assignments.length) return <p style={{ color: "var(--text-dim)" }}>No dares yet.</p>;

  return (
    <div>
      {assignments.map((a) => (
        <DareCard key={a.id} assignment={a} />
      ))}
    </div>
  );
}
