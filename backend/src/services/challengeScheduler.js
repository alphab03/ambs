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

// --- Timezone-aware date helpers ---
// Railway's containers run on whatever clock the host defaults to (no TZ env var is
// set, so Node treats "local" as UTC). Groups configure a `timezone` (IANA name, e.g.
// "America/New_York") and expect sendWindowStart/End to mean wall-clock time THERE, not
// on the server. These helpers use Node's built-in Intl (no extra dependency) to convert
// between the two correctly, including across DST changes.

// Calendar date (Y/M/D) that `date` falls on when viewed in `timeZone`.
function zonedYMD(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

// Offset (ms) such that: wall-clock-in-timeZone = utcInstant + offset.
function tzOffsetMs(timeZone, utcInstant) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(utcInstant);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - utcInstant.getTime();
}

// Builds the real UTC Date corresponding to `minutesSinceMidnight` on the given Y/M/D,
// interpreted as wall-clock time in `timeZone`.
function zonedTimeToUtc({ year, month, day }, minutesSinceMidnight, timeZone) {
  const guessUtcMs = Date.UTC(year, month - 1, day, 0, minutesSinceMidnight, 0, 0);
  const offset = tzOffsetMs(timeZone, new Date(guessUtcMs));
  return new Date(guessUtcMs - offset);
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

  const timeZone = group.timezone || "America/New_York";
  const challenge = randomFrom(challenges);
  const assignedUserId = randomFrom(group.memberIds);
  const sendMinute = randomTimeWithinWindow(
    group.sendWindowStart || "09:00",
    group.sendWindowEnd || "20:00"
  );

  const now = new Date();
  let sentAt = zonedTimeToUtc(zonedYMD(now, timeZone), sendMinute, timeZone);
  if (sentAt < now) {
    // Window already passed today in the group's timezone — use tomorrow instead.
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    sentAt = zonedTimeToUtc(zonedYMD(tomorrow, timeZone), sendMinute, timeZone);
  }

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
export async function startScheduler({ groupId }) {
  // The server's own clock isn't necessarily the group's timezone (Railway defaults to
  // UTC), so fetch the group up front and schedule the daily job in ITS timezone —
  // otherwise "00:05" fires at server-midnight, which can be hours off from the group's
  // actual local midnight.
  let timeZone = "America/New_York";
  try {
    const group = await getGroup(groupId);
    timeZone = group.timezone || timeZone;
  } catch (err) {
    console.error(`startScheduler: couldn't load group ${groupId}, defaulting timezone to ${timeZone}:`, err);
  }

  // Every day at 00:05 in the group's timezone, create the day's assignment (send time is
  // randomized inside the window, also computed in the group's timezone).
  cron.schedule(
    "5 0 * * *",
    async () => {
      try {
        const { assignmentId, sentAt } = await createDailyAssignment(groupId);
        const delayMs = sentAt.getTime() - Date.now();
        setTimeout(() => sendAssignmentSms(assignmentId).catch(console.error), Math.max(delayMs, 0));
      } catch (err) {
        console.error("createDailyAssignment failed:", err);
      }
    },
    { timezone: timeZone }
  );

  // Every 5 minutes, sweep for expired assignments.
  cron.schedule("*/5 * * * *", () => {
    resolveExpiredAssignments().catch(console.error);
  });
}
