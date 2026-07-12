import { Router } from "express";
import { submitPrediction } from "../services/predictionService.js";

const router = Router();

router.post("/", async (req, res) => {
  const { assignmentId, predictorUserId, call } = req.body;
  if (!assignmentId || !predictorUserId || !["yes", "no"].includes(call)) {
    return res.status(400).json({ error: "assignmentId, predictorUserId, and call ('yes'|'no') are required" });
  }

  try {
    const result = await submitPrediction({ assignmentId, predictorUserId, call });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
