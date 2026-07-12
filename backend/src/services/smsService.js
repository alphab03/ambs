import { twilioClient, TWILIO_FROM_NUMBER } from "../config/twilio.js";

export async function sendSms(toPhone, body) {
  return twilioClient().messages.create({
    from: TWILIO_FROM_NUMBER,
    to: toPhone,
    body,
  });
}

export function challengeMessage({ challengeText, deadlineAt }) {
  const time = new Date(deadlineAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `Today's challenge: ${challengeText}\n\nYou have until ${time} to do it and upload proof. No proof = automatic "no". Good luck.`;
}

export function resultMessage({ name, outcome, challengeText }) {
  return outcome === "yes"
    ? `${name} did it: "${challengeText}". Go predict correctly next time to unlock the proof.`
    : `${name} did NOT complete today's challenge in time: "${challengeText}".`;
}
