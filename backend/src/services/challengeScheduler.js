import cron from "node-cron";
import { randomUUID } from "crypto";
import { db, admin } from "../config/firebase.js";
import { COLLECTIONS, ASSIGNMENT_STATUS } from "../models/schema.js";
import { sendSms, challengeMessage, resultMessage } from "./smsService.js";

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Pick a random time-of-day (minutes since midnight) between two "HH:MM" strings.
function randomTimeWithinWindow(startHHMM, endHHMM) {
  const [sh, sm] = startHHMM.split(":").map(Number);
  const [eh, em] = endHHMM.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  return startMin + Math.floor(Math.random() * Math.max(endMin - startMin, 1));
}

async function getActiveChallenges() {
  const snap = await db().collection(COLLECTIONS.CHALLENGES).where("active", "==", true).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function getGroup(groupId) {
  const doc = await db().collection(COLLECTIONS.GROUPS).doc(groupId).get();
  if (!doc.exists) throw new Error(`Group ${groupId} not found`);
  return { id: doc.id, ...doc.data() };
}

async function getUser(userId) {
  const doc = await db().collection(COLLECTIONS.USERS).doc(userId).get();
  return { id: doc.id, ...doc.data() };
}

/**
 * Creates today's assignment for a group: picks a random challenge + random member + random
 * send time within the group's window, then sends the SMS. Intended to run once per day
 * (e.g. shortly after midnight in the group's timezone) via the cron job below.
 */
export async function createDailyAssignment(groupId) {
  const group = await getGroup(groupId);
  const challenges = await getActiveChallenges();
  if (challenges.length === 0) throw new Error("No active challenges in the pool");
  if (!group.memberIds?.length) throw new Error("Group has no members");

  const challenge = randomFrom(challenges);
  const assignedUserId = randomFrom(group.memberIds);
  const sendMinute = randomTimeWithinWindow(
    group.sendWindowStart || "09:00",
    group.sendWindowEnd || "20:00"
  );

  const now = new Date();
  const sentAt = new Date(now);
  sentAt.setHours(0, sendMinute, 0, 0);
  if (sentAt < now) sentAt.setDate(sentAt.getDate() + 1); // window already passed today

  const deadlineAt = new Date(sentAt.getTime() + (group.deadlineHours || 4) * 60 * 60 * 1000);

  const assignmentId = randomUUID();
  await db()
    .collection(COLLECTIONS.ASSIGNMENTS)
    .doc(assignmentId)
    .set({
      groupId,
      challengeId: challenge.id,
      assignedUserId,
      sentAt: admin.firestore.Timestamp.fromDate(sentAt),
      deadlineAt: admin.firestore.Timestamp.fromDate(deadlineAt),
      status: ASSIGNMENT_STATUS.PENDING,
      proofPath: null,
      proofSubmittedAt: null,
      outcome: null,
      resolvedAt: null,
    });

  return { assignmentId, challenge, assignedUserId, sentAt, deadlineAt };
}

// Sends the SMS for an assignment that's already been created. Split out from
// createDailyAssignment so a scheduled function can create-at-midnight and
// send-at-random-time separately if you want tighter randomness later.
export async function sendAssignmentSms(assignmentId) {
  const doc = await db().collection(COLLECTIONS.ASSIGNMENTS).doc(assignmentId).get();
  const assignment = doc.data();
  const [challengeDoc, user] = await Promise.all([
    db().collection(COLLECTIONS.CHALLENGES).doc(assignment.challengeId).get(),
    getUser(assignment.assignedUserId),
  ]);

  await sendSms(
    user.phone,
    challengeMessage({
      challengeText: challengeDoc.data().text,
      deadlineAt: assignment.deadlineAt.toDate(),
      assignmentId,
    })
  );
}

/**
 * Resolves any assignment whose deadline has passed without proof: marks it "no",
 * scores predictions, and updates leaderboardStats. Run on a short interval (e.g. every
 * 5 min) via cron.
 */
export async function resolveExpiredAssignments() {
  const now = admin.firestore.Timestamp.now();
  const snap = await db()
    .collection(COLLECTIONS.ASSIGNMENTS)
    .where("status", "==", ASSIGNMENT_STATUS.PENDING)
    .where("deadlineAt", "<=", now)
    .get();

  for (const doc of snap.docs) {
    await resolveAssignment(doc.id, "no");
  }
}

export async function resolveAssignment(assignmentId, outcome) {
  const ref = db().collection(COLLECTIONS.ASSIGNMENTS).doc(assignmentId);
  const doc = await ref.get();
  const assignment = doc.data();
  if (assignment.status !== ASSIGNMENT_STATUS.PENDING) return; // already resolved

  await ref.update({
    status:
      outcome === "yes" ? ASSIGNMENT_STATUS.COMPLETED : ASSIGNMENT_STATUS.EXPIRED,
    outcome,
    resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Score predictions + bump leaderboardStats. Imported lazily to avoid a circular import.
  const { scorePredictions } = await import("./predictionService.js");
  await scorePredictions(assignmentId, outcome);
}

// Wire the two recurring jobs. Call this once from server.js.
export function startScheduler({ groupId }) {
  // Every day at 00:05, create tomorrow's assignment (send time is randomized inside the window).
  cron.schedule("5 0 * * *", async () => {
    try {
      const { assignmentId, sentAt } = await createDailyAssignment(groupId);
      const delayMs = sentAt.getTime() - Date.now();
      setTimeout(() => sendAssignmentSms(assignmentId).catch(console.error), Math.max(delayMs, 0));
    } catch (err) {
      console.error("createDailyAssignment failed:", err);
    }
  });

  // Every 5 minutes, sweep for expired assignments.
  cron.schedule("*/5 * * * *", () => {
    resolveExpiredAssignments().catch(console.error);
  });
}
