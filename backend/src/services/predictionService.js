import { db, admin } from "../config/firebase.js";
import { COLLECTIONS, leaderboardStatsId } from "../models/schema.js";

export async function submitPrediction({ assignmentId, predictorUserId, call }) {
  const assignmentRef = db().collection(COLLECTIONS.ASSIGNMENTS).doc(assignmentId);
  const assignment = (await assignmentRef.get()).data();

  if (!assignment) throw new Error("Assignment not found");
  if (assignment.status !== "pending") throw new Error("Predictions are closed for this dare");
  if (predictorUserId === assignment.assignedUserId) {
    throw new Error("You can't predict on your own dare");
  }

  const predictionRef = assignmentRef.collection("predictions").doc(predictorUserId);
  const existing = await predictionRef.get();
  if (existing.exists) throw new Error("You already predicted on this dare");

  await predictionRef.set({
    predictorUserId,
    call,
    lockedAt: admin.firestore.FieldValue.serverTimestamp(),
    correct: null,
  });

  return { assignmentId, predictorUserId, call };
}

// Called by dareScheduler.resolveAssignment once an outcome is known.
export async function scorePredictions(assignmentId, outcome) {
  const assignmentRef = db().collection(COLLECTIONS.ASSIGNMENTS).doc(assignmentId);
  const groupId = (await assignmentRef.get()).data().groupId;
  const predictionsSnap = await assignmentRef.collection("predictions").get();

  const batch = db().batch();
  for (const doc of predictionsSnap.docs) {
    const { call, predictorUserId } = doc.data();
    const correct = call === outcome;
    batch.update(doc.ref, { correct });

    const statsRef = db()
      .collection(COLLECTIONS.LEADERBOARD_STATS)
      .doc(leaderboardStatsId(groupId, predictorUserId));
    batch.set(
      statsRef,
      {
        groupId,
        userId: predictorUserId,
        totalPredictions: admin.firestore.FieldValue.increment(1),
        correctPredictions: admin.firestore.FieldValue.increment(correct ? 1 : 0),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }
  await batch.commit();

  // Recompute accuracy for anyone touched (increment can't do division).
  for (const doc of predictionsSnap.docs) {
    const { predictorUserId } = doc.data();
    const statsRef = db()
      .collection(COLLECTIONS.LEADERBOARD_STATS)
      .doc(leaderboardStatsId(groupId, predictorUserId));
    const stats = (await statsRef.get()).data();
    if (stats?.totalPredictions) {
      await statsRef.update({ accuracy: stats.correctPredictions / stats.totalPredictions });
    }
  }
}

// Used by the video-gating endpoint: can this user watch this proof?
export async function canViewProof(assignmentId, userId) {
  const predictionDoc = await db()
    .collection(COLLECTIONS.ASSIGNMENTS)
    .doc(assignmentId)
    .collection("predictions")
    .doc(userId)
    .get();

  return predictionDoc.exists && predictionDoc.data().correct === true;
}
