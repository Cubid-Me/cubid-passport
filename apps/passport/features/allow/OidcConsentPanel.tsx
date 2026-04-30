"use client"

type OidcConsentPanelProps = {
  challenge: any
  loading: boolean
  onFinalize: (action: "approve" | "reject") => void
  submitting: boolean
}

export function OidcConsentPanel({
  challenge,
  loading,
  onFinalize,
  submitting,
}: OidcConsentPanelProps) {
  if (loading) {
    return (
      <div className="flex h-[100vh] w-[100vw] items-center justify-center dark:bg-gray-900 dark:text-white">
        <p>Loading consent request...</p>
      </div>
    )
  }

  if (!challenge) {
    return (
      <div className="flex h-[100vh] w-[100vw] items-center justify-center dark:bg-gray-900 dark:text-white">
        <p>Invalid or expired consent challenge.</p>
      </div>
    )
  }

  return (
    <div className="min-h-[100vh] bg-background px-4 py-16 text-foreground">
      <div className="mx-auto max-w-2xl rounded-xl border bg-card p-8 shadow-sm">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Login with Cubid
        </p>
        <h1 className="mt-3 text-3xl font-semibold">
          Share Cubid data with {challenge?.client?.client_name}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Review the requested access before finishing sign-in.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Requested scopes
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {(challenge?.requested_scopes ?? []).map((scope: string) => (
                <li key={scope} className="rounded bg-muted px-3 py-2">
                  {scope}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Requested claims
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {(challenge?.requestedClaims ?? []).map((claim: string) => (
                <li key={claim} className="rounded bg-muted px-3 py-2">
                  {claim}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700 disabled:opacity-60"
            disabled={submitting}
            onClick={() => onFinalize("reject")}
          >
            Deny
          </button>
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60"
            disabled={submitting}
            onClick={() => onFinalize("approve")}
          >
            Approve and continue
          </button>
        </div>
      </div>
    </div>
  )
}
