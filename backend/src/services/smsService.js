import { twilioClient, TWILIO_FROM_NUMBER } from "../config/twilio.js";

export async function sendSms(toPhone, body) {
  return twilioClient().messages.create({
    from: TWILIO_FROM_NUMBER,
    to: toPhone,
    body,
  });
}

export function challengeMessage({ challengeText, deadlineAt, assignmentId }) {
  const time = new Date(deadlineAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const link = assignmentUrl(assignmentId);
  return `Today's challenge: ${challengeText}\n\nYou have until ${time} to do it and upload proof. No proof = automatic "no". Good luck.${link ? `\n\n${link}` : ""}`;
}

// Builds a direct link to this assignment's page on the dashboard, if DASHBOARD_URL
// is configured. Falls back to no link (rather than a broken one) if it's not set.
export function assignmentUrl(assignmentId) {
  const base = process.env.DASHBOARD_URL;
  if (!base || !assignmentId) return null;
  return `${base.replace(/\/$/, "")}/challenge/${assignmentId}`;
}

export function resultMessage({ name, outcome, challengeText }) {
  return outcome === "yes"
    ? `${name} did it: "${challengeText}". Go predict correctly next time to unlock the proof.`
    : `${name} did NOT complete today's challenge in time: "${challengeText}".`;
}
