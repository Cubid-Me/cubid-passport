import { redirect } from "next/navigation"

import { createRequestId } from "@cubid/auth/server"

import { createClearPassVerificationRedirect } from "@/lib/server/clearpassVerify"

export default async function ClearPassVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{
    page_id?: string
    uid?: string
  }>
}) {
  const params = await searchParams
  let clearPassUrl: string

  try {
    const { redirectUrl } = await createClearPassVerificationRedirect({
      pageId: params.page_id ?? "",
      requestId: createRequestId("passport"),
      uid: params.uid ?? "",
    })
    clearPassUrl = redirectUrl
  } catch (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12 text-slate-900">
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            ClearPass Verify
          </p>
          <h1 className="mt-3 text-3xl font-bold">
            We could not start this verification
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            ClearPass is a third-party verification provider. Please return to
            the app that requested this stamp and try again.
          </p>
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            {error instanceof Error ? error.message : "Verification start failed."}
          </p>
        </section>
      </main>
    )
  }

  redirect(clearPassUrl)
}
