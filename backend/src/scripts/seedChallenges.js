// One-off: node src/scripts/seedChallenges.js
import { db, admin } from "../config/firebase.js";
import { COLLECTIONS } from "../models/schema.js";

const STARTER_CHALLENGES = [
  "Text your last text-message sender and tell them one honest thing you never said.",
  "Post an unedited selfie taken right now, no filter, no retake.",
  "Call a family member and tell them why you appreciate them, on speakerphone, and record it.",
  "Eat a spoonful of a condiment you hate, on camera.",
  "Do 50 push-ups in a public place and film it.",
  "Send a voice memo singing the chorus of the last song you listened to.",
  "Leave a genuinely nice comment on a stranger's post and screenshot it.",
];

async function seed() {
  const batch = db().batch();
  for (const text of STARTER_CHALLENGES) {
    const ref = db().collection(COLLECTIONS.CHALLENGES).doc();
    batch.set(ref, { text, active: true, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  }
  await batch.commit();
  console.log(`Seeded ${STARTER_CHALLENGES.length} challenges.`);
}

seed().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
