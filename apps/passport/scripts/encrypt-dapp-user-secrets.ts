import {
  DAPP_USER_SECRET_LEGACY_SENTINEL,
  DAPP_USER_SECRET_PURPOSE,
  encryptDappUserSecret,
} from "../lib/server/dappUserSecrets"
import { getPassportSupabase } from "../lib/server/supabase"

type LegacyDappUserSecretRow = {
  description: string | null
  dapp_user_uuid: string
  id: number
  secret: string
  secret_sequential_id: number
}

const isDryRun = process.argv.includes("--dry-run")

const main = async () => {
  const supabase = getPassportSupabase()
  const { data: rows, error } = await supabase
    .from("dapp_user_secrets")
    .select("id,dapp_user_uuid,secret,secret_sequential_id,description")
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

    const { data: existingPrivateRow, error: existingPrivateError } =
      await supabase
        .schema("private")
        .from("dapp_user_secrets")
        .select("id")
        .eq("legacy_public_secret_id", row.id)
        .maybeSingle()

    if (existingPrivateError) {
      throw existingPrivateError
    }

    if (existingPrivateRow) {
      skippedCount += 1
      continue
    }

    const encrypted = await encryptDappUserSecret(supabase, row.secret, {
      dappId: dappUser.dapp_id,
      dappUserUuid: row.dapp_user_uuid,
      purpose: DAPP_USER_SECRET_PURPOSE,
    })

    const { error: insertError } = await supabase
      .schema("private")
      .from("dapp_user_secrets")
      .insert({
        ...encrypted,
        dapp_user_uuid: row.dapp_user_uuid,
        description: row.description,
        legacy_public_secret_id: row.id,
        migrated_from_public_at: new Date().toISOString(),
        secret: DAPP_USER_SECRET_LEGACY_SENTINEL,
        secret_sequential_id: row.secret_sequential_id,
      })

    if (insertError) {
      throw insertError
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
