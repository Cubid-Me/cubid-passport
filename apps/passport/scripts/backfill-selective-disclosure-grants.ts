import { getStampTypeName } from "@cubid/stamps"

import { persistAllowPageDisclosureForStampPermission } from "../lib/server/passportData"
import { getPassportSupabase } from "../lib/server/supabase"

type LegacyStampPermissionRow = {
  dappuser_id: string | null
  id: number | string
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
const PAGE_SIZE = 500

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

const fetchDappUsers = async (
  supabase: ReturnType<typeof getPassportSupabase>,
  dappUserIds: string[]
) => {
  if (dappUserIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from("dapp_users")
    .select("uuid,dapp_id")
    .in("uuid", dappUserIds)

  if (error) {
    throw error
  }

  return (data ?? []) as DappUserRow[]
}

const fetchStamps = async (
  supabase: ReturnType<typeof getPassportSupabase>,
  stampIds: string[]
) => {
  if (stampIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from("stamps")
    .select("id,stamptype")
    .in("id", stampIds)

  if (error) {
    throw error
  }

  return (data ?? []) as StampRow[]
}

const main = async () => {
  const limit = getLimit()
  const supabase = getPassportSupabase()
  const summaryByDapp = new Map<string, number>()
  const summaryByStampType = new Map<string, number>()
  let backfilledCount = 0
  let scannedCount = 0
  let skippedCount = 0
  let offset = 0

  while (limit === null || scannedCount < limit) {
    const remaining = limit === null ? PAGE_SIZE : Math.min(PAGE_SIZE, limit - scannedCount)
    const { data: permissionRows, error: permissionError } = await supabase
      .from("stamp_dappuser_permissions")
      .select("id,dappuser_id,stamp_id")
      .order("id", { ascending: true })
      .range(offset, offset + remaining - 1)

    if (permissionError) {
      throw permissionError
    }

    const permissions = (permissionRows ?? []) as LegacyStampPermissionRow[]
    if (permissions.length === 0) {
      break
    }

    scannedCount += permissions.length
    offset += permissions.length

    const dappUserIds = uniqueStrings(permissions.map((row) => row.dappuser_id))
    const stampIds = uniqueStrings(permissions.map((row) => row.stamp_id))
    const [dappUsers, stamps] = await Promise.all([
      fetchDappUsers(supabase, dappUserIds),
      fetchStamps(supabase, stampIds),
    ])
    const dappUsersById = new Map(
      dappUsers.map((row) => [String(row.uuid), row])
    )
    const stampsById = new Map(stamps.map((row) => [String(row.id), row]))

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

    if (permissions.length < remaining) {
      break
    }
  }

  process.stdout.write(
    [
      `legacy stamp permissions scanned: ${scannedCount}`,
      `selective disclosure grants ${isDryRun ? "would backfill" : "backfilled"}: ${backfilledCount}`,
      `legacy rows skipped: ${skippedCount}`,
      `page size: ${PAGE_SIZE}`,
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
