import { Router } from "express";
import { db } from "../config/firebase.js";
import { COLLECTIONS, ASSIGNMENT_STATUS } from "../models/schema.js";
import { sendSms } from "../services/smsService.js";

const router = Router();

// Twilio hits this on every inbound SMS to the app's number.
// Configure in Twilio console: Messaging -> A Message Comes In -> POST {BASE_URL}/webhooks/sms
router.post("/sms", async (req, res) => {
  const from = req.body.From;
  const body = (req.body.Body || "").trim().toLowerCase();

  try {
    const userSnap = await db().collection(COLLECTIONS.USERS).where("phone", "==", from).limit(1).get();
    if (userSnap.empty) {
      return respond(res, "We don't recognize this number. Ask the group admin to add you.");
    }
    const user = { id: userSnap.docs[0].id, ...userSnap.docs[0].data() };

    // Find this user's currently-pending assignment, if any.
    const assignmentSnap = await db()
      .collection(COLLECTIONS.ASSIGNMENTS)
      .where("assignedUserId", "==", user.id)
      .where("status", "==", ASSIGNMENT_STATUS.PENDING)
      .limit(1)
      .get();

    if (assignmentSnap.empty) {
      return respond(res, "No active dare for you right now. Check the dashboard for what's happened so far.");
    }

    // Proof is submitted via the dashboard (MMS-to-webhook media handling is a
    // follow-up; for now point them there so upload logic lives in one place).
    return respond(
      res,
      `Got it. Upload your proof on the dashboard before the deadline to lock in a "yes".`
    );
  } catch (err) {
    console.error(err);
    return respond(res, "Something went wrong on our end — try again in a bit.");
  }
});

function respond(res, message) {
  res.type("text/xml");
  res.send(`<Response><Message>${message}</Message></Response>`);
}

export default router;
