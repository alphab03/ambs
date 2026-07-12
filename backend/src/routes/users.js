import { Router } from "express";
import { db } from "../config/firebase.js";
import { COLLECTIONS } from "../models/schema.js";

const router = Router();

// Lightweight member list for the dashboard's identity picker.
// No auth yet — fine for a closed group MVP, revisit before wider rollout.
router.get("/", async (req, res) => {
  const { groupId } = req.query;
  if (!groupId) return res.status(400).json({ error: "groupId is required" });

  const groupDoc = await db().collection(COLLECTIONS.GROUPS).doc(groupId).get();
  const memberIds = groupDoc.data()?.memberIds || [];
  if (!memberIds.length) return res.json([]);

  const docs = await db().getAll(
    ...memberIds.map((id) => db().collection(COLLECTIONS.USERS).doc(id))
  );
  res.json(docs.map((d) => ({ id: d.id, name: d.data()?.name })));
});

export default router;
