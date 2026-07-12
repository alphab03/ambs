// Central place for collection names + small shape helpers.
// See /docs/firestore-schema.md for the full field-level spec.

export const COLLECTIONS = {
  GROUPS: "groups",
  USERS: "users",
  DARES: "dares",
  ASSIGNMENTS: "assignments",
  LEADERBOARD_STATS: "leaderboardStats",
};

export const ASSIGNMENT_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  EXPIRED: "expired",
};

export const OUTCOME = {
  YES: "yes",
  NO: "no",
};

export function leaderboardStatsId(groupId, userId) {
  return `${groupId}_${userId}`;
}
