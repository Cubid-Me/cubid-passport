import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

const allowPreviewPlaceholders =
  process.env.CI === "true" ||
  (process.env.VERCEL === "1" && process.env.VERCEL_ENV !== "production");

const firebaseEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
} as const;

const missingFirebaseEnv = Object.entries(firebaseEnv)
  .filter(([, value]) => !value?.trim())
  .map(([key]) => key);

if (missingFirebaseEnv.length > 0 && !allowPreviewPlaceholders) {
  throw new Error(`Missing Firebase environment configuration: ${missingFirebaseEnv.join(', ')}`);
}

const firebaseConfig = {
  apiKey: firebaseEnv.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'ci-placeholder-api-key',
  authDomain:
    firebaseEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    'ci-placeholder.firebaseapp.com',
  projectId: firebaseEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'ci-placeholder',
  storageBucket:
    firebaseEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    'ci-placeholder.appspot.com',
  messagingSenderId:
    firebaseEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
  appId:
    firebaseEnv.NEXT_PUBLIC_FIREBASE_APP_ID ??
    '1:000000000000:web:0000000000000000000000',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export default firebase;
