import {
  DAPP_USER_SECRET_LEGACY_SENTINEL,
  DAPP_USER_SECRET_PURPOSE,
  encryptDappUserSecret,
} from "../lib/server/dappUserSecrets"
import { getPassportSupabase } from "../lib/server/supabase"

type LegacyDappUserSecretRow = {
  dapp_user_uuid: string
  id: number
  secret: string
  secret_ciphertext: string | null
}

const isDryRun = process.argv.includes("--dry-run")

const main = async () => {
  const supabase = getPassportSupabase()
  const { data: rows, error } = await supabase
    .from("dapp_user_secrets")
    .select("id,dapp_user_uuid,secret,secret_ciphertext")
    .is("secret_ciphertext", null)
    .neq("secret", DAPP_USER_SECRET_LEGACY_SENTINEL)

  if (error) {
    throw error
  }

  const legacyRows = (rows ?? []) as LegacyDappUserSecretRow[]
  let encryptedCount = 0
  let skippedCount = 0

  for (const row of legacyRows) {
    if (!row.secret || row.secret === DAPP_USER_SECRET_LEGACY_SENTINEL) {
      skippedCount += 1
      continue
    }

    const { data: dappUser, error: dappUserError } = await supabase
      .from("dapp_users")
      .select("uuid,dapp_id")
      .eq("uuid", row.dapp_user_uuid)
      .maybeSingle()

    if (dappUserError) {
      throw dappUserError
    }

    if (!dappUser?.dapp_id) {
      skippedCount += 1
      continue
    }

    if (isDryRun) {
      encryptedCount += 1
      continue
    }

    const encrypted = await encryptDappUserSecret(supabase, row.secret, {
      dappId: dappUser.dapp_id,
      dappUserUuid: row.dapp_user_uuid,
      purpose: DAPP_USER_SECRET_PURPOSE,
    })

    const { error: updateError } = await supabase
      .from("dapp_user_secrets")
      .update({
        ...encrypted,
        migrated_from_plaintext_at: new Date().toISOString(),
        secret: DAPP_USER_SECRET_LEGACY_SENTINEL,
      })
      .eq("id", row.id)

    if (updateError) {
      throw updateError
    }

    encryptedCount += 1
  }

  process.stdout.write(
    [
      `dapp_user_secrets legacy rows scanned: ${legacyRows.length}`,
      `dapp_user_secrets ${isDryRun ? "would encrypt" : "encrypted"}: ${encryptedCount}`,
      `dapp_user_secrets skipped: ${skippedCount}`,
      "",
    ].join("\n")
  )
}

main().catch((error) => {
  process.stderr.write(
    error instanceof Error ? `${error.message}\n` : `${String(error)}\n`
  )
  process.exitCode = 1
})
