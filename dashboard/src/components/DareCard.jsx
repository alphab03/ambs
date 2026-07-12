import { Link } from "react-router-dom";

const STATUS_LABEL = {
  pending: { text: "In progress", cls: "pending" },
  completed: { text: "Done", cls: "yes" },
  expired: { text: "No proof", cls: "no" },
};

export default function DareCard({ assignment }) {
  const status = STATUS_LABEL[assignment.status] || STATUS_LABEL.pending;
  return (
    <Link to={`/dare/${assignment.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div className="card">
        <span className={`pill ${status.cls}`}>{status.text}</span>
        <h3 style={{ marginTop: 8 }}>{assignment.dareText}</h3>
        <p style={{ color: "var(--text-dim)", margin: 0 }}>
          {assignment.assignedUserName} &middot;{" "}
          {new Date(assignment.sentAt?._seconds ? assignment.sentAt._seconds * 1000 : assignment.sentAt).toLocaleDateString()}
        </p>
      </div>
    </Link>
  );
}
