import { redirect } from "next/navigation"

import { createRequestId } from "@cubid/auth/server"

import { completeClearPassVerification } from "@/lib/server/clearpassVerify"

export default async function ClearPassCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{
    clearpass_session?: string
    verification_id?: string
  }>
}) {
  const params = await searchParams
  let returnTo: string

  try {
    const result = await completeClearPassVerification({
      clearpassSession: params.clearpass_session ?? "",
      requestId: createRequestId("passport"),
      verificationId: params.verification_id ?? null,
    })
    returnTo = result.returnTo
  } catch (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12 text-slate-900">
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            ClearPass Verify
          </p>
          <h1 className="mt-3 text-3xl font-bold">
            Verification could not be accepted
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            ClearPass is a third-party verification provider. Please return to
            the app that requested this stamp and try again.
          </p>
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            {error instanceof Error ? error.message : "Verification failed."}
          </p>
        </section>
      </main>
    )
  }

  redirect(returnTo)
}
