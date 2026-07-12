import admin from "firebase-admin";
import { readFileSync } from "fs";
import "dotenv/config";

let app;

export function initFirebase() {
  if (app) return app;

  const serviceAccount = JSON.parse(
    readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf-8")
  );

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
