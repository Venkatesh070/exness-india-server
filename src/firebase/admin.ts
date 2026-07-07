import admin from "firebase-admin";
import { env } from "../config/env.js";

let initialized = false;

export function initFirebase(): void {
  if (initialized) return;

  if (env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  } else {
    admin.initializeApp({ projectId: env.FIREBASE_PROJECT_ID });
  }

  initialized = true;
}

export function getFirebaseAuth() {
  initFirebase();
  return admin.auth();
}
