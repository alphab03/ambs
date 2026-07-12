import { twilioClient, TWILIO_FROM_NUMBER } from "../config/twilio.js";

export async function sendSms(toPhone, body) {
  return twilioClient().messages.create({
    from: TWILIO_FROM_NUMBER,
    to: toPhone,
    body,
  });
}

export function dareMessage({ dareText, deadlineAt }) {
  const time = new Date(deadlineAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `Today's dare: ${dareText}\n\nYou have until ${time} to do it and upload proof. No proof = automatic "no". Good luck.`;
}

export function resultMessage({ name, outcome, dareText }) {
  return outcome === "yes"
    ? `${name} did it: "${dareText}". Go predict correctly next time to unlock the proof.`
    : `${name} did NOT complete today's dare in time: "${dareText}".`;
}
