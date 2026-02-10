import admin from "firebase-admin";
import fs from "fs";

let initialized = false;
let firestore = null;
let bucket = null;

export function initFirebase() {
  // If already initialized, STOP here
  if (initialized) return;

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  // If .env has not loaded yet, STOP silently
if (!credPath || !fs.existsSync(credPath)) {
  console.warn("⚠️ Firebase credentials not found, skipping Admin init");
  return;
}

  // If file does not exist, STOP silently
 if (!fs.existsSync(credPath)) {
  console.log("❌ FIREBASE ERROR: serviceAccountKey.json NOT FOUND at:", credPath);
  return;
}

  // REAL initialization
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(credPath, "utf8"));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });

    firestore = admin.firestore();
    bucket = admin.storage().bucket();

    initialized = true;
    console.log("🔥 Firebase Admin initialized");

  } catch (err) {
    console.error("❌ Firebase initialization failed:", err.message);
  }
}

// Lazy loading — init only when needed
export function getFirestore() {
  initFirebase();
  return firestore;
}

export function getBucket() {
  initFirebase();
  return bucket;
}
export { admin };