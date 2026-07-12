import { Router } from "express";
import { db } from "../config/firebase.js";
import { COLLECTIONS } from "../models/schema.js";

const router = Router();

// History feed for the dashboard: past assignments for a group, newest first.
router.get("/history", async (req, res) => {
  const { groupId, limit = 30 } = req.query;
  if (!groupId) return res.status(400).json({ error: "groupId is required" });

  const snap = await db()
    .collection(COLLECTIONS.ASSIGNMENTS)
    .where("groupId", "==", groupId)
    .orderBy("sentAt", "desc")
    .limit(Number(limit))
    .get();

  const assignments = await Promise.all(
    snap.docs.map(async (doc) => {
      const data = doc.data();
      const [challengeDoc, userDoc] = await Promise.all([
        db().collection(COLLECTIONS.CHALLENGES).doc(data.challengeId).get(),
        db().collection(COLLECTIONS.USERS).doc(data.assignedUserId).get(),
      ]);
      return {
        id: doc.id,
        ...data,
        challengeText: challengeDoc.data()?.text,
        assignedUserName: userDoc.data()?.name,
      };
    })
  );

  res.json(assignments);
});

// Raw pool management (admin use — no auth yet, add before shipping past your own use).
router.get("/pool", async (_req, res) => {
  const snap = await db().collection(COLLECTIONS.CHALLENGES).get();
  res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
});

router.post("/pool", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "text is required" });
  const ref = await db().collection(COLLECTIONS.CHALLENGES).add({
    text,
    active: true,
    createdAt: new Date(),
  });
  res.status(201).json({ id: ref.id });
});

export default router;
