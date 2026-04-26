/**
 * Firebase config — reads from .env (REACT_APP_FIREBASE_*)
 * Users paste their config values into .env or the in-app setup screen.
 *
 * How to get these values:
 *   firebase apps:sdkconfig WEB --project YOUR_PROJECT_ID
 */
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId:     process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
);

let app: FirebaseApp | null = null;

if (firebaseConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
}

export const auth       = app ? getAuth(app)     : null;
export const db         = app ? getFirestore(app): null;
export const googleProvider = new GoogleAuthProvider();
