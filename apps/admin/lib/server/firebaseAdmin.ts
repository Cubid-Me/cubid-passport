import { getRequiredEnv } from '@cubid/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export const getFirebaseAdminAuth = () => {
  const existingApp = getApps()[0];

  if (existingApp) {
    return getAuth(existingApp);
  }

  const app = initializeApp({
    credential: cert({
      projectId: getRequiredEnv('FIREBASE_PROJECT_ID'),
      clientEmail: getRequiredEnv('FIREBASE_CLIENT_EMAIL'),
      privateKey: getRequiredEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    }),
  });

  return getAuth(app);
};
