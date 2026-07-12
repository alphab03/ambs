import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useIdentity } from "../IdentityContext.jsx";
import { api } from "../api/client.js";
import LockedVideo from "../components/LockedVideo.jsx";

export default function ChallengeDetail() {
  const { assignmentId } = useParams();
  const { userId } = useIdentity();
  const [assignment, setAssignment] = useState(null);
  const [call, setCall] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  function refetch() {
    // Reuse the history endpoint's shape by pulling the one assignment from the list.
    // A dedicated GET /api/challenges/:id is a natural follow-up once this is real traffic.
    return api.history(100).then((rows) => setAssignment(rows.find((r) => r.id === assignmentId)));
  }

  useEffect(() => {
    refetch();
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

  async function submitProof() {
    if (!proofFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      await api.uploadProof(assignmentId, proofFile);
      await refetch();
      setProofFile(null);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
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
        <h2>{assignment.challengeText}</h2>
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

      {!isResolved && assignment.assignedUserId === userId && (
        <div className="card">
          <h3>Submit your proof</h3>
          <p style={{ color: "var(--text-dim)" }}>
            Upload a photo or video before the deadline to lock in a "yes".
          </p>
          <input
            type="file"
            accept="image/*,video/*"
            capture="environment"
            disabled={uploading}
            onChange={(e) => setProofFile(e.target.files?.[0] || null)}
          />
          <div style={{ marginTop: 12 }}>
            <button className="primary" disabled={!proofFile || uploading} onClick={submitProof}>
              {uploading ? "Uploading…" : "Submit proof"}
            </button>
          </div>
          {uploadError && <p style={{ color: "#f87171" }}>{uploadError}</p>}
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
