import { getFirebaseAdminCredentials } from '@cubid/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export const getFirebaseAdminAuth = () => {
  const existingApp = getApps()[0];

  if (existingApp) {
    return getAuth(existingApp);
  }

  const app = initializeApp({
    credential: cert(getFirebaseAdminCredentials()),
  });

  return getAuth(app);
};
