import { Routes, Route } from "react-router-dom";
import { IdentityProvider, useIdentity } from "./IdentityContext.jsx";
import Feed from "./pages/Feed.jsx";

function IdentityPicker() {
  const { members, userId, selectUser } = useIdentity();
  return (
    <div className="identity-picker card">
      <h3>Who are you?</h3>
      <select value={userId} onChange={(e) => selectUser(e.target.value)}>
        <option value="" disabled>
          Pick your name
        </option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  );
}

// One page: a reverse-chronological feed of challenges, ordered by post time. Upload your
// proof right on your own card; everyone else's proof shows up inline once they post it.
export default function App() {
  return (
    <IdentityProvider>
      <div className="app-shell">
        <h1>challenge-app</h1>
        <IdentityPicker />
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/challenge/:assignmentId" element={<Feed />} />
        </Routes>
      </div>
    </IdentityProvider>
  );
}
