import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"

const getRequiredEnv = (name: string) => {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required environment variable ${name}`)
  }

  return value
}

export const getPassportFirebaseAdminAuth = () => {
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
