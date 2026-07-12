import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useIdentity } from "../IdentityContext.jsx";
import { api } from "../api/client.js";
import LockedVideo from "../components/LockedVideo.jsx";

export default function DareDetail() {
  const { assignmentId } = useParams();
  const { userId } = useIdentity();
  const [assignment, setAssignment] = useState(null);
  const [call, setCall] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Reuse the history endpoint's shape by pulling the one assignment from the list.
    // A dedicated GET /api/dares/:id is a natural follow-up once this is real traffic.
    api.history(100).then((rows) => setAssignment(rows.find((r) => r.id === assignmentId)));
  }, [assignmentId]);

  async function submitPrediction(choice) {
    setSubmitting(true);
    setError(null);
    try {
      await api.predict(assignmentId, userId, choice);
      setCall(choice);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!assignment) return <p>Loading…</p>;

  const isResolved = assignment.status !== "pending";

  return (
    <div>
      <div className="card">
        <span className={`pill ${assignment.status === "pending" ? "pending" : assignment.status === "completed" ? "yes" : "no"}`}>
          {assignment.status}
        </span>
        <h2>{assignment.dareText}</h2>
        <p style={{ color: "var(--text-dim)" }}>Assigned to {assignment.assignedUserName}</p>
      </div>

      {!isResolved && assignment.assignedUserId !== userId && (
        <div className="card">
          <h3>Will they do it?</h3>
          {call ? (
            <p>You predicted: <strong>{call}</strong>. Check back after the deadline.</p>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button className="primary" disabled={submitting} onClick={() => submitPrediction("yes")}>
                Yes
              </button>
              <button className="secondary" disabled={submitting} onClick={() => submitPrediction("no")}>
                No
              </button>
            </div>
          )}
          {error && <p style={{ color: "#f87171" }}>{error}</p>}
        </div>
      )}

      {isResolved && assignment.status === "completed" && (
        <div className="card">
          <h3>Proof</h3>
          <LockedVideo assignmentId={assignmentId} userId={userId} />
        </div>
      )}
    </div>
  );
}
