import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api/client.js";

// Closed-group MVP: no auth, just "who are you" persisted in localStorage.
// Swap for real auth before opening this up beyond your friend group.
const IdentityContext = createContext(null);

export function IdentityProvider({ children }) {
  const [members, setMembers] = useState([]);
  const [userId, setUserId] = useState(() => localStorage.getItem("dare-app:userId") || "");

  useEffect(() => {
    api.users().then(setMembers).catch(console.error);
  }, []);

  function selectUser(id) {
    setUserId(id);
    localStorage.setItem("dare-app:userId", id);
  }

  const me = members.find((m) => m.id === userId) || null;

  return (
    <IdentityContext.Provider value={{ members, userId, me, selectUser }}>
      {children}
    </IdentityContext.Provider>
  );
}

export function useIdentity() {
  return useContext(IdentityContext);
}
