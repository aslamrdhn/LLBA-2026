import * as admin from "firebase-admin";

let firebaseApp: any = null;

export function getFirebaseAdmin() {
  if (!firebaseApp) {
    // If we have a credential file (e.g. deployed) we could use it,
    // otherwise just initializing with projectId is enough for token verification.
    firebaseApp = admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || "pro-cumulus-xmvz5",
    });
  }
  return firebaseApp;
}
