import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const app = getApps().length > 0
  ? getApp()
  : initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)) });

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
