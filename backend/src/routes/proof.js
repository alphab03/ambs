import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { db, bucket, admin } from "../config/firebase.js";
import { COLLECTIONS, ASSIGNMENT_STATUS } from "../models/schema.js";
import { resolveAssignment } from "../services/challengeScheduler.js";
import { canViewProof } from "../services/predictionService.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
const router = Router();

// Upload proof for a still-pending assignment. Marks it "yes" and resolves predictions.
router.post("/:assignmentId", upload.single("file"), async (req, res) => {
  const { assignmentId } = req.params;
  if (!req.file) return res.status(400).json({ error: "file is required" });

  const ref = db().collection(COLLECTIONS.ASSIGNMENTS).doc(assignmentId);
  const doc = await ref.get();
  if (!doc.exists) return res.status(404).json({ error: "assignment not found" });
  const assignment = doc.data();

  if (assignment.status !== ASSIGNMENT_STATUS.PENDING) {
    return res.status(400).json({ error: "This challenge is already resolved" });
  }
  if (Date.now() > assignment.deadlineAt.toDate().getTime()) {
    return res.status(400).json({ error: "Deadline has passed" });
  }

  const ext = req.file.originalname.split(".").pop();
  const path = `proofs/${assignmentId}/${randomUUID()}.${ext}`;
  const blob = bucket().file(path);
  await blob.save(req.file.buffer, { contentType: req.file.mimetype });

  await ref.update({
    proofPath: path,
    proofSubmittedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await resolveAssignment(assignmentId, "yes");

  res.status(201).json({ path });
});

// Gated fetch: only returns a signed URL if this user predicted correctly.
router.get("/:assignmentId/view", async (req, res) => {
  const { assignmentId } = req.params;
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  const allowed = await canViewProof(assignmentId, userId);
  if (!allowed) return res.status(403).json({ error: "Locked — you didn't predict correctly on this one" });

  const doc = await db().collection(COLLECTIONS.ASSIGNMENTS).doc(assignmentId).get();
  const { proofPath } = doc.data();
  if (!proofPath) return res.status(404).json({ error: "No proof on file" });

  const [url] = await bucket()
    .file(proofPath)
    .getSignedUrl({ action: "read", expires: Date.now() + 15 * 60 * 1000 });

  res.json({ url });
});

export default router;
