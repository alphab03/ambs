import { Router } from "express";
import { db } from "../config/firebase.js";
import { COLLECTIONS } from "../models/schema.js";

const router = Router();

router.get("/", async (req, res) => {
  const { groupId } = req.query;
  if (!groupId) return res.status(400).json({ error: "groupId is required" });

  const snap = await db()
    .collection(COLLECTIONS.LEADERBOARD_STATS)
    .where("groupId", "==", groupId)
    .orderBy("accuracy", "desc")
    .get();

  const rows = await Promise.all(
    snap.docs.map(async (doc) => {
      const data = doc.data();
      const userDoc = await db().collection(COLLECTIONS.USERS).doc(data.userId).get();
      return { ...data, name: userDoc.data()?.name };
    })
  );

  res.json(rows);
});

export default router;
