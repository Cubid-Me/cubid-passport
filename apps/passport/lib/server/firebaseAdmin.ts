import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth, type Auth } from "firebase-admin/auth"

let firebaseAdminAuthOverride: Pick<Auth, "verifyIdToken"> | null = null

const getRequiredEnv = (name: string) => {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required environment variable ${name}`)
  }

  return value
}

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
      credential: cert({
        projectId: getRequiredEnv("FIREBASE_PROJECT_ID"),
        clientEmail: getRequiredEnv("FIREBASE_CLIENT_EMAIL"),
        privateKey: getRequiredEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
      }),
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
