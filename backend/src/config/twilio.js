import Twilio from "twilio";
import "dotenv/config";

let client;

export function twilioClient() {
  if (!client) {
    client = Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return client;
}

export const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
