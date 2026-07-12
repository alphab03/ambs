import admin from "firebase-admin";
import { readFileSync } from "fs";
import "dotenv/config";

let app;

export function initFirebase() {
  if (app) return app;

  // Prefer a base64-encoded service account (set as a Railway/host env var —
  // can't commit the actual JSON file). Falls back to reading a local file
  // path for local dev, matching FIREBASE_SERVICE_ACCOUNT_PATH in .env.example.
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
    ? JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf-8"))
    : JSON.parse(readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf-8"));

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });

  return app;
}

export function db() {
  if (!app) initFirebase();
  return admin.firestore();
}

export function bucket() {
  if (!app) initFirebase();
  return admin.storage().bucket();
}

export { admin };
