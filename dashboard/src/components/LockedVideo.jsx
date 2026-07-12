import { useEffect, useState } from "react";
import { api } from "../api/client.js";

// Shows the proof video if this user predicted correctly, otherwise a locked
// placeholder. This is the core FOMO mechanic — keep the copy playful, not apologetic.
export default function LockedVideo({ assignmentId, userId }) {
  const [state, setState] = useState({ loading: true, url: null, error: null });

  useEffect(() => {
    if (!userId) return;
    api
      .proofViewUrl(assignmentId, userId)
      .then(({ url }) => setState({ loading: false, url, error: null }))
      .catch((err) => setState({ loading: false, url: null, error: err.message }));
  }, [assignmentId, userId]);

  if (state.loading) return <div className="locked-video">Loading…</div>;

  if (state.url) {
    return (
      <video controls style={{ width: "100%", borderRadius: 16 }}>
        <source src={state.url} />
      </video>
    );
  }

  return (
    <div className="locked-video">
      <strong>Locked</strong>
      <span>You have to predict correctly to unlock this one.</span>
    </div>
  );
}
