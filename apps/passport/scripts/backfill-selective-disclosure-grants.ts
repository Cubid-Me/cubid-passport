import { getStampTypeName } from "@cubid/stamps"

import { persistAllowPageDisclosureForStampPermission } from "../lib/server/passportData"
import { getPassportSupabase } from "../lib/server/supabase"

type LegacyStampPermissionRow = {
  dappuser_id: string | null
  stamp_id: number | string | null
}

type DappUserRow = {
  dapp_id: number | string | null
  uuid: string
}

type StampRow = {
  id: number | string
  stamptype: number | string | null
}

const isDryRun = process.argv.includes("--dry-run")

const getLimit = () => {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="))
  if (!limitArg) {
    return null
  }

  const value = Number(limitArg.slice("--limit=".length))
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("--limit must be a positive integer")
  }

  return value
}

const uniqueStrings = (values: Array<number | string | null | undefined>) => [
  ...new Set(
    values
      .filter((value): value is number | string => value !== null && value !== undefined)
      .map(String)
  ),
]

const main = async () => {
  const limit = getLimit()
  const supabase = getPassportSupabase()
  let query = supabase
    .from("stamp_dappuser_permissions")
    .select("dappuser_id,stamp_id")

  if (limit) {
    query = query.limit(limit)
  }

  const { data: permissionRows, error: permissionError } = await query

  if (permissionError) {
    throw permissionError
  }

  const permissions = (permissionRows ?? []) as LegacyStampPermissionRow[]
  const dappUserIds = uniqueStrings(permissions.map((row) => row.dappuser_id))
  const stampIds = uniqueStrings(permissions.map((row) => row.stamp_id))

  const [
    { data: dappUsers, error: dappUsersError },
    { data: stamps, error: stampsError },
  ] = await Promise.all([
    dappUserIds.length
      ? supabase.from("dapp_users").select("uuid,dapp_id").in("uuid", dappUserIds)
      : Promise.resolve({ data: [], error: null }),
    stampIds.length
      ? supabase.from("stamps").select("id,stamptype").in("id", stampIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (dappUsersError) {
    throw dappUsersError
  }

  if (stampsError) {
    throw stampsError
  }

  const dappUsersById = new Map(
    ((dappUsers ?? []) as DappUserRow[]).map((row) => [String(row.uuid), row])
  )
  const stampsById = new Map(
    ((stamps ?? []) as StampRow[]).map((row) => [String(row.id), row])
  )
  const summaryByDapp = new Map<string, number>()
  const summaryByStampType = new Map<string, number>()
  let backfilledCount = 0
  let skippedCount = 0

  for (const permission of permissions) {
    const dappUserId = String(permission.dappuser_id ?? "")
    const stampId = String(permission.stamp_id ?? "")
    const dappUser = dappUsersById.get(dappUserId)
    const stamp = stampsById.get(stampId)

    if (!dappUser?.dapp_id || !stamp?.stamptype) {
      skippedCount += 1
      continue
    }

    const dappId = String(dappUser.dapp_id)
    const stampTypeName = getStampTypeName(Number(stamp.stamptype))
    summaryByDapp.set(dappId, (summaryByDapp.get(dappId) ?? 0) + 1)
    summaryByStampType.set(
      stampTypeName,
      (summaryByStampType.get(stampTypeName) ?? 0) + 1
    )

    if (!isDryRun) {
      await persistAllowPageDisclosureForStampPermission({
        dappUserId,
        stampId,
      })
    }

    backfilledCount += 1
  }

  process.stdout.write(
    [
      `legacy stamp permissions scanned: ${permissions.length}`,
      `selective disclosure grants ${isDryRun ? "would backfill" : "backfilled"}: ${backfilledCount}`,
      `legacy rows skipped: ${skippedCount}`,
      `by dapp: ${JSON.stringify(Object.fromEntries([...summaryByDapp.entries()].sort()))}`,
      `by stamp type: ${JSON.stringify(Object.fromEntries([...summaryByStampType.entries()].sort()))}`,
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
