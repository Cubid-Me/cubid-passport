import { randomUUID } from "node:crypto"

import { getPassportSupabase } from "../lib/server/supabase"
import {
  encryptWebhookSigningSecret,
  WEBHOOK_SIGNING_SECRET_LEGACY_SENTINEL,
} from "../lib/server/webhookSigningSecrets"

type LegacyWebhookSubscriptionRow = {
  dapp: number | string
  id: number | string
  secret: string | null
  secret_ciphertext: string | null
  secret_reference_id: string | null
  webhook: string
}

const isDryRun = process.argv.includes("--dry-run")

async function main() {
  const supabase = getPassportSupabase()
  const { data: legacyRows, error } = await supabase
    .from("dapp_webhook_subscriptions")
    .select("id,dapp,webhook,secret,secret_ciphertext,secret_reference_id")
    .is("secret_ciphertext", null)
    .not("secret", "is", null)
    .neq("secret", WEBHOOK_SIGNING_SECRET_LEGACY_SENTINEL)

  if (error) {
    throw error
  }

  let encryptedCount = 0
  let skippedCount = 0

  for (const row of (legacyRows ?? []) as LegacyWebhookSubscriptionRow[]) {
    if (!row.secret || row.secret === WEBHOOK_SIGNING_SECRET_LEGACY_SENTINEL) {
      skippedCount += 1
      continue
    }

    const secretReferenceId = row.secret_reference_id ?? randomUUID()

    if (isDryRun) {
      encryptedCount += 1
      continue
    }

    const encrypted = await encryptWebhookSigningSecret(supabase, row.secret, {
      dappId: row.dapp,
      secretReferenceId,
      webhook: row.webhook,
    })

    const { error: updateError } = await supabase
      .from("dapp_webhook_subscriptions")
      .update({
        ...encrypted,
        secret: WEBHOOK_SIGNING_SECRET_LEGACY_SENTINEL,
        secret_encrypted_at: new Date().toISOString(),
        secret_migrated_from_plaintext_at: new Date().toISOString(),
        secret_reference_id: secretReferenceId,
      })
      .eq("id", row.id)

    if (updateError) {
      throw updateError
    }

    encryptedCount += 1
  }

  console.log(
    [
      `dapp_webhook_subscriptions legacy rows scanned: ${legacyRows?.length ?? 0}`,
      `dapp_webhook_subscriptions ${isDryRun ? "would encrypt" : "encrypted"}: ${encryptedCount}`,
      `dapp_webhook_subscriptions skipped: ${skippedCount}`,
    ].join("\n")
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
