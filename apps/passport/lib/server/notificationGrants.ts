import { ApiSecurityError } from "@cubid/auth/server"

import type { PassportAnonymousContext } from "./passportApi"

const NOTIFICATION_CATEGORIES = ["SECURITY", "TRANSACTIONAL", "WORKFLOW"] as const

type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]

type AllowPageGrantContext = {
  dappId: number | string
  dappName: string
  dappUserUuid: string
  pageId: number
  userId: number | string
}

type GrantRow = {
  category_key: NotificationCategory
  created_at: string
  dapp_id: number | string
  dapp_user_uuid: string
  expires_at: string | null
  granted_at: string
  id: string
  revoked_at: string | null
  status: "active" | "revoked" | "expired"
  updated_at: string
  user_id: number | string
}

export type NotificationGrantSummary = {
  categoryKey: NotificationCategory
  dappId: string
  dappName: string
  dappUserUuid: string
  expiresAt: string | null
  grantId: string
  grantedAt: string
  revokedAt: string | null
  status: string
  updatedAt: string
}

const assertCategory = (category: string): NotificationCategory => {
  if (
    !NOTIFICATION_CATEGORIES.includes(category as NotificationCategory)
  ) {
    throw new ApiSecurityError(
      400,
      "invalid_request",
      "Unsupported notification category."
    )
  }

  return category as NotificationCategory
}

const mapGrant = (
  context: AllowPageGrantContext,
  row: GrantRow
): NotificationGrantSummary => ({
  categoryKey: row.category_key,
  dappId: String(context.dappId),
  dappName: context.dappName,
  dappUserUuid: context.dappUserUuid,
  expiresAt: row.expires_at ?? null,
  grantId: String(row.id),
  grantedAt: String(row.granted_at),
  revokedAt: row.revoked_at ?? null,
  status: String(row.status),
  updatedAt: String(row.updated_at),
})

export async function resolveNotificationAllowPageContext(
  context: PassportAnonymousContext,
  input: { pageId: number | string; uid: string }
): Promise<AllowPageGrantContext> {
  const pageId = Number(input.pageId)

  if (!Number.isInteger(pageId) || pageId <= 0) {
    throw new ApiSecurityError(400, "invalid_request", "Invalid page id.")
  }

  const [dappUserResponse, pageResponse] = await Promise.all([
    context.supabase
      .from("dapp_users")
      .select("uuid,dapp_id,user_id,dapps:dapp_id(appname)")
      .eq("uuid", input.uid)
      .maybeSingle(),
    context.supabase
      .from("dapp_pages")
      .select("id,dapp_id")
      .eq("id", pageId)
      .maybeSingle(),
  ])

  if (dappUserResponse.error) {
    throw dappUserResponse.error
  }
  if (pageResponse.error) {
    throw pageResponse.error
  }

  const dappUser = dappUserResponse.data as
    | (Record<string, unknown> & {
        dapp_id: number | string
        user_id: number | string
      })
    | null
  const page = pageResponse.data as
    | (Record<string, unknown> & { dapp_id: number | string })
    | null

  if (!dappUser || !page || String(dappUser.dapp_id) !== String(page.dapp_id)) {
    throw new ApiSecurityError(
      404,
      "not_found",
      "Notification grant context was not found."
    )
  }

  const nestedDapp = dappUser.dapps as Record<string, unknown> | undefined

  return {
    dappId: dappUser.dapp_id,
    dappName:
      typeof nestedDapp?.appname === "string"
        ? nestedDapp.appname
        : `Dapp ${dappUser.dapp_id}`,
    dappUserUuid: input.uid,
    pageId,
    userId: dappUser.user_id,
  }
}

export async function listNotificationAllowPageGrants(
  context: PassportAnonymousContext,
  input: { pageId: number | string; uid: string }
) {
  const grantContext = await resolveNotificationAllowPageContext(context, input)
  const { data, error } = await context.supabase
    .from("notification_app_grants")
    .select("*")
    .eq("dapp_id", grantContext.dappId)
    .eq("dapp_user_uuid", grantContext.dappUserUuid)
    .eq("user_id", grantContext.userId)

  if (error) {
    throw error
  }

  return {
    availableCategories: [...NOTIFICATION_CATEGORIES],
    grants: ((data ?? []) as GrantRow[]).map((row) =>
      mapGrant(grantContext, row)
    ),
  }
}

export async function updateNotificationAllowPageGrants(
  context: PassportAnonymousContext,
  input: { categories: string[]; pageId: number | string; uid: string }
) {
  const grantContext = await resolveNotificationAllowPageContext(context, input)
  const selectedCategories = new Set(input.categories.map(assertCategory))
  const now = new Date().toISOString()

  const { data: existingData, error: existingError } = await context.supabase
    .from("notification_app_grants")
    .select("*")
    .eq("dapp_id", grantContext.dappId)
    .eq("dapp_user_uuid", grantContext.dappUserUuid)
    .eq("user_id", grantContext.userId)

  if (existingError) {
    throw existingError
  }

  const existing = ((existingData ?? []) as GrantRow[]).filter((row) =>
    NOTIFICATION_CATEGORIES.includes(row.category_key)
  )
  const existingByCategory = new Map(
    existing.map((row) => [row.category_key, row])
  )

  for (const category of NOTIFICATION_CATEGORIES) {
    const row = existingByCategory.get(category)

    if (selectedCategories.has(category)) {
      if (row?.status === "active") {
        continue
      }

      if (row) {
        const { error } = await context.supabase
          .from("notification_app_grants")
          .update({
            granted_at: now,
            revoked_at: null,
            status: "active",
            updated_at: now,
          })
          .eq("id", row.id)

        if (error) {
          throw error
        }
        continue
      }

      const { error } = await context.supabase
        .from("notification_app_grants")
        .insert({
          category_key: category,
          dapp_id: grantContext.dappId,
          dapp_user_uuid: grantContext.dappUserUuid,
          granted_at: now,
          status: "active",
          updated_at: now,
          user_id: grantContext.userId,
        })

      if (error) {
        throw error
      }
      continue
    }

    if (row?.status === "active") {
      const { error } = await context.supabase
        .from("notification_app_grants")
        .update({
          revoked_at: now,
          status: "revoked",
          updated_at: now,
        })
        .eq("id", row.id)

      if (error) {
        throw error
      }
    }
  }

  return listNotificationAllowPageGrants(context, input)
}
