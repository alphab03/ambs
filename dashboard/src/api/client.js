const BASE_URL = import.meta.env.VITE_API_BASE_URL;
export const GROUP_ID = import.meta.env.VITE_GROUP_ID;

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  users: () => request(`/api/users?groupId=${GROUP_ID}`),
  history: (limit = 30) => request(`/api/challenges/history?groupId=${GROUP_ID}&limit=${limit}`),
  proofViewUrl: (assignmentId) => request(`/api/proof/${assignmentId}/view`),
  uploadProof: (assignmentId, file) => {
    const form = new FormData();
    form.append("file", file);
    return fetch(`${BASE_URL}/api/proof/${assignmentId}`, { method: "POST", body: form }).then(
      async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
        return res.json();
      }
    );
  },
};
