import admin from "firebase-admin";

let initialized = false;
let firestore = null;
let bucket = null;

export function initFirebase() {
  if (initialized) return;

  const {
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY,
    FIREBASE_STORAGE_BUCKET,
  } = process.env;

  // If any required env var is missing, STOP
  if (
    !FIREBASE_PROJECT_ID ||
    !FIREBASE_CLIENT_EMAIL ||
    !FIREBASE_PRIVATE_KEY
  ) {
    console.warn("⚠️ Firebase env vars missing, skipping Admin init");
    return;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
      storageBucket: FIREBASE_STORAGE_BUCKET,
    });

    firestore = admin.firestore();
    bucket = admin.storage().bucket();

    initialized = true;
    console.log("🔥 Firebase Admin initialized (env-based)");

  } catch (err) {
    console.error("❌ Firebase initialization failed:", err.message);
  }
}

// Lazy init
export function getFirestore() {
  initFirebase();
  return firestore;
}

export function getBucket() {
  initFirebase();
  return bucket;
}

export { admin };
