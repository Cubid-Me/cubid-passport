import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth, type Auth } from "firebase-admin/auth"

import { getFirebaseAdminCredentials } from "@cubid/config"

let firebaseAdminAuthOverride: Pick<Auth, "verifyIdToken"> | null = null

export const getPassportFirebaseAdminAuth = () => {
  if (firebaseAdminAuthOverride) {
    return firebaseAdminAuthOverride
  }

  const existingApp = getApps().find((app) => app.name === "passport-server")

  if (existingApp) {
    return getAuth(existingApp)
  }

  const app = initializeApp(
    {
      credential: cert(getFirebaseAdminCredentials()),
    },
    "passport-server"
  )

  return getAuth(app)
}

export const setPassportFirebaseAdminAuthForTests = (
  auth: Pick<Auth, "verifyIdToken"> | null
) => {
  firebaseAdminAuthOverride = auth
}
