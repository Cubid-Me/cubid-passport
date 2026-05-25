"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import axios from "axios"
import useAuth from "@/hooks/useAuth"
import firebase from "@/lib/firebase"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type ReleaseResult = {
  bundleMaterial: string
  dappUserUuid: string
  providerKey: string
  recoveryBundleId: string
  recoverySessionId: string
  releasedAt: string
  status: string
}

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.error?.message ??
      error.response?.data?.message ??
      error.message
    )
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Unable to complete this recovery request."
}

export default function RecoverableWalletRecoveryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const recoverySessionId = searchParams?.get("recovery_session_id") ?? ""
  const { loading, user } = useAuth({})
  const [releaseLoading, setReleaseLoading] = useState(false)
  const [release, setRelease] = useState<ReleaseResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showMaterial, setShowMaterial] = useState(false)
  const [copied, setCopied] = useState(false)

  const shortSessionId = useMemo(() => {
    if (!recoverySessionId) {
      return ""
    }

    if (recoverySessionId.length <= 18) {
      return recoverySessionId
    }

    return `${recoverySessionId.slice(0, 12)}...${recoverySessionId.slice(-6)}`
  }, [recoverySessionId])

  const signInAndReturn = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "passport_post_login_redirect",
        `${window.location.pathname}${window.location.search}`
      )
    }

    router.push("/login")
  }

  const releaseBundle = async () => {
    setReleaseLoading(true)
    setErrorMessage(null)
    setCopied(false)

    try {
      const firebaseUser = firebase.auth().currentUser
      const idToken = await firebaseUser?.getIdToken()

      if (!idToken) {
        throw new Error("Please sign in to Cubid before releasing recovery material.")
      }

      const { data } = await axios.post(
        "/api/recovery-bundles/release/complete",
        {
          recovery_session_id: recoverySessionId,
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      )

      setRelease(data.data)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setReleaseLoading(false)
    }
  }

  const copyMaterial = async () => {
    if (!release?.bundleMaterial || !navigator.clipboard) {
      return
    }

    await navigator.clipboard.writeText(release.bundleMaterial)
    setCopied(true)
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-slate-950 px-4 py-16 text-white">
      <section className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">
            Cubid recovery
          </p>
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">
            Recover an app-mediated wallet
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-300">
            Cubid verifies that this recovery request belongs to you, then
            releases the recovery bundle only to this signed-in browser. Cubid
            does not create wallets or perform normal transaction signing for
            the app.
          </p>
        </div>

        <Card className="border-white/10 bg-white text-slate-950 shadow-2xl">
          <CardHeader>
            <CardTitle>Recovery request</CardTitle>
            <CardDescription>
              Session{" "}
              <span className="font-mono text-xs">
                {shortSessionId || "missing"}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!recoverySessionId && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                This recovery link is missing a recovery session id. Ask the app
                to start a new recovery request.
              </div>
            )}

            {recoverySessionId && loading && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                Checking your Cubid sign-in...
              </div>
            )}

            {recoverySessionId && !loading && !user && (
              <div className="space-y-4">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Sign in with the Cubid identity that owns this recovery
                  request. Recovery material will not be released until your
                  signed-in identity matches the request.
                </div>
                <Button onClick={signInAndReturn}>Sign in to continue</Button>
              </div>
            )}

            {recoverySessionId && !loading && user && !release && (
              <div className="space-y-4">
                <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950">
                  You are signed in as{" "}
                  <span className="font-medium">
                    {user.email || user.phone || "this Cubid user"}
                  </span>
                  . If this recovery request belongs to a different Cubid
                  identity, it will be rejected.
                </div>
                <Button onClick={releaseBundle} disabled={releaseLoading}>
                  {releaseLoading
                    ? "Releasing recovery bundle..."
                    : "Release recovery bundle"}
                </Button>
              </div>
            )}

            {errorMessage && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                {errorMessage}
              </div>
            )}

            {release && (
              <div className="space-y-4">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                  Recovery bundle released at{" "}
                  <span className="font-mono text-xs">{release.releasedAt}</span>
                  . Copy it into the requesting app only if you recognize the
                  recovery flow.
                </div>

                <dl className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">Provider</dt>
                    <dd className="font-medium">{release.providerKey}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Status</dt>
                    <dd className="font-medium">{release.status}</dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="text-slate-500">Recovery bundle</dt>
                    <dd className="break-all font-mono text-xs">
                      {release.recoveryBundleId}
                    </dd>
                  </div>
                </dl>

                <div className="space-y-3 rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-semibold">Recovery material</h2>
                      <p className="text-sm text-slate-600">
                        This is sensitive. Cubid shows it only after your
                        signed-in identity is verified for this one-time
                        session.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowMaterial((current) => !current)}
                    >
                      {showMaterial ? "Hide" : "Reveal"}
                    </Button>
                  </div>

                  {showMaterial && (
                    <textarea
                      readOnly
                      className="min-h-32 w-full rounded-md border border-slate-300 bg-slate-950 p-3 font-mono text-xs text-slate-50"
                      value={release.bundleMaterial}
                    />
                  )}

                  <Button
                    variant="secondary"
                    onClick={copyMaterial}
                    disabled={!showMaterial}
                  >
                    {copied ? "Copied" : "Copy recovery material"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
