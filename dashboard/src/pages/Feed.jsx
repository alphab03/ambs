import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useIdentity } from "../IdentityContext.jsx";
import { api } from "../api/client.js";

const STATUS_LABEL = {
  pending: { text: "In progress", cls: "pending" },
  completed: { text: "Done", cls: "yes" },
  expired: { text: "No proof", cls: "no" },
};

function formatPostTime(sentAt) {
  const ms = sentAt?._seconds ? sentAt._seconds * 1000 : sentAt;
  return new Date(ms).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Proof can be a photo or a video (upload accepts both) — pick the tag by extension.
function ProofMedia({ path, url }) {
  const isVideo = /\.(mp4|mov|webm|m4v)$/i.test(path || "");
  if (isVideo) {
    return (
      <video controls style={{ width: "100%", borderRadius: 16, marginTop: 12 }}>
        <source src={url} />
      </video>
    );
  }
  return <img src={url} alt="proof" style={{ width: "100%", borderRadius: 16, marginTop: 12 }} />;
}

function FeedItem({ assignment, isMine, onUploaded }) {
  const status = STATUS_LABEL[assignment.status] || STATUS_LABEL.pending;
  const [proofUrl, setProofUrl] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (assignment.status === "completed" && assignment.proofPath) {
      api
        .proofViewUrl(assignment.id)
        .then(({ url }) => setProofUrl(url))
        .catch(() => {});
    }
  }, [assignment.id, assignment.status, assignment.proofPath]);

  async function submit() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await api.uploadProof(assignment.id, file);
      setFile(null);
      onUploaded();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="card" id={assignment.id}>
      <span className={`pill ${status.cls}`}>{status.text}</span>
      <h3 style={{ marginTop: 8 }}>{assignment.challengeText}</h3>
      <p style={{ color: "var(--text-dim)", margin: 0 }}>
        {assignment.assignedUserName} &middot; {formatPostTime(assignment.sentAt)}
      </p>

      {proofUrl && <ProofMedia path={assignment.proofPath} url={proofUrl} />}

      {assignment.status === "pending" && isMine && (
        <div style={{ marginTop: 12 }}>
          <input
            type="file"
            accept="image/*,video/*"
            capture="environment"
            disabled={uploading}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <div style={{ marginTop: 8 }}>
            <button className="primary" disabled={!file || uploading} onClick={submit}>
              {uploading ? "Uploading…" : "Submit proof"}
            </button>
          </div>
          {error && <p style={{ color: "#f87171" }}>{error}</p>}
        </div>
      )}
    </div>
  );
}

// The whole app: one reverse-chronological feed of challenges, ordered by post time.
// Whoever's currently assigned sees an upload box right on their own card; everyone else
// just sees the feed update once proof lands. No predictions, no separate pages.
export default function Feed() {
  const { userId } = useIdentity();
  const { assignmentId } = useParams();
  const [assignments, setAssignments] = useState([]);
  const [error, setError] = useState(null);
  const scrolledRef = useRef(false);

  function refetch() {
    return api.history(100).then(setAssignments).catch((err) => setError(err.message));
  }

  useEffect(() => {
    refetch();
  }, []);

  // If we arrived via a direct SMS link (/challenge/:id), jump to that card once it's loaded.
  useEffect(() => {
    if (assignmentId && assignments.length && !scrolledRef.current) {
      document.getElementById(assignmentId)?.scrollIntoView({ block: "center" });
      scrolledRef.current = true;
    }
  }, [assignmentId, assignments]);

  if (error) return <p>{error}</p>;
  if (!assignments.length) return <p style={{ color: "var(--text-dim)" }}>No challenges yet.</p>;

  return (
    <div>
      {assignments.map((a) => (
        <FeedItem key={a.id} assignment={a} isMine={a.assignedUserId === userId} onUploaded={refetch} />
      ))}
    </div>
  );
}
