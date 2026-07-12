import { Routes, Route, NavLink } from "react-router-dom";
import { IdentityProvider, useIdentity } from "./IdentityContext.jsx";
import History from "./pages/History.jsx";
import Leaderboard from "./pages/Leaderboard.jsx";
import ChallengeDetail from "./pages/ChallengeDetail.jsx";

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

export default function App() {
  return (
    <IdentityProvider>
      <div className="app-shell">
        <h1>challenge-app</h1>
        <IdentityPicker />
        <Routes>
          <Route path="/" element={<History />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/challenge/:assignmentId" element={<ChallengeDetail />} />
        </Routes>
        <nav className="tabbar">
          <NavLink to="/" className={({ isActive }) => (isActive ? "active" : "")}>
            History
          </NavLink>
          <NavLink to="/leaderboard" className={({ isActive }) => (isActive ? "active" : "")}>
            Leaderboard
          </NavLink>
        </nav>
      </div>
    </IdentityProvider>
  );
}
