import { ApiSecurityError } from "@cubid/auth/server"

import { sendNotificationEmail } from "./emailOtp"
import { decryptNotificationChannelDestination } from "./notificationChannels"
import type { PassportDappContext } from "./passportApi"

const NOTIFICATION_CATEGORIES = ["SECURITY", "TRANSACTIONAL", "WORKFLOW"] as const
const NOTIFICATION_PRIORITIES = ["LOW", "NORMAL", "HIGH", "CRITICAL"] as const

type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]
type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number]

type DappUserRow = {
  dapp_id: number | string
  user_id: number | string
  uuid: string
}

type AppPolicyRow = {
  allowed_categories?: string[] | null
  allowed_priorities?: string[] | null
  allowed_providers?: string[] | null
  daily_limit?: number | null
  minute_limit?: number | null
  sandbox_mode?: boolean | null
  security_category_enabled?: boolean | null
  status?: string | null
}

type GrantRow = {
  category_key: string
  status: string
}

type PreferenceRow = {
  category_key: string
  channel_id?: string | null
  dapp_id?: number | string | null
  muted_until?: string | null
  paused_until?: string | null
  status?: string | null
}

type ChannelRow = {
  channel_type: string
  id: string
  is_default?: boolean | null
  muted_until?: string | null
  paused_until?: string | null
  provider_key: string
  status?: string | null
  user_id: number | string
  verification_status?: string | null
}

type DeliveryAttemptRow = {
  id: string
}

type SendNotificationInput = {
  body: string
  category: NotificationCategory
  deepLink?: string | null
  dappUserUuid: string
  metadata?: Record<string, unknown>
  priority: NotificationPriority
  requestId: string
  title: string
}

export type SendNotificationResult = {
  category: NotificationCategory
  createdAt: string
  eventId: string
  priority: NotificationPriority
  selectedChannelType: string
  status: "accepted"
}

const isFuture = (value: string | null | undefined) => {
  return Boolean(value && new Date(value).getTime() > Date.now())
}

const asStringArray = (value: unknown) => {
  return Array.isArray(value) ? value.map(String) : []
}

const assertPolicyAllowsRequest = (
  policy: AppPolicyRow | null,
  input: SendNotificationInput
) => {
  if (!policy || policy.status !== "enabled") {
    throw new ApiSecurityError(
      403,
      "notification_policy_disabled",
      "This app is not enabled to send notifications."
    )
  }

  const allowedCategories = asStringArray(policy.allowed_categories)
  const allowedPriorities = asStringArray(policy.allowed_priorities)

  if (!allowedCategories.includes(input.category)) {
    throw new ApiSecurityError(
      403,
      "notification_category_denied",
      "This notification category is not enabled for the app."
    )
  }

  if (
    input.category === "SECURITY" &&
    policy.security_category_enabled !== true
  ) {
    throw new ApiSecurityError(
      403,
      "notification_category_denied",
      "Security notifications are not enabled for the app."
    )
  }

  if (!allowedPriorities.includes(input.priority)) {
    throw new ApiSecurityError(
      403,
      "notification_priority_denied",
      "This notification priority is not enabled for the app."
    )
  }
}

const assertActiveGrant = (grant: GrantRow | null) => {
  if (!grant || grant.status !== "active") {
    throw new ApiSecurityError(
      403,
      "notification_grant_required",
      "The user has not granted this app permission to send this notification category."
    )
  }
}

const assertPreferenceAllowsDelivery = (preference: PreferenceRow | null) => {
  if (!preference) {
    return
  }

  if (
    preference.status === "muted" ||
    preference.status === "paused" ||
    isFuture(preference.muted_until) ||
    isFuture(preference.paused_until)
  ) {
    throw new ApiSecurityError(
      403,
      "notification_muted",
      "The user has muted or paused this notification category."
    )
  }
}

const assertEligibleChannel = (
  channel: ChannelRow | null,
  allowedProviders: string[]
) => {
  if (!channel) {
    return null
  }

  if (
    channel.status !== "active" ||
    channel.verification_status !== "verified" ||
    isFuture(channel.muted_until) ||
    isFuture(channel.paused_until)
  ) {
    return null
  }

  if (!allowedProviders.includes(channel.provider_key)) {
    return null
  }

  return channel
}

const selectEligibleChannel = (input: {
  allowedProviders: string[]
  appPreference: PreferenceRow | null
  channels: ChannelRow[]
  globalPreference: PreferenceRow | null
}) => {
  const byId = new Map(input.channels.map((channel) => [String(channel.id), channel]))
  const preferredChannelId =
    input.appPreference?.channel_id ?? input.globalPreference?.channel_id ?? null

  if (preferredChannelId) {
    const preferred = assertEligibleChannel(
      byId.get(String(preferredChannelId)) ?? null,
      input.allowedProviders
    )

    if (preferred) {
      return preferred
    }
  }

  return (
    input.channels.find((channel) =>
      Boolean(
        channel.is_default &&
          assertEligibleChannel(channel, input.allowedProviders)
      )
    ) ??
    input.channels.find((channel) =>
      Boolean(assertEligibleChannel(channel, input.allowedProviders))
    ) ??
    null
  )
}

const insertDeniedEvent = async (
  context: PassportDappContext,
  input: SendNotificationInput,
  dappUser: DappUserRow,
  error: ApiSecurityError
) => {
  await context.supabase.from("notification_events").insert({
    body: input.body,
    category_key: input.category,
    dapp_id: context.dapp.id,
    dapp_user_uuid: input.dappUserUuid,
    deep_link: input.deepLink ?? null,
    denied_reason: error.code,
    metadata: input.metadata ?? {},
    priority: input.priority,
    request_id: input.requestId,
    status: "denied",
    title: input.title,
    updated_at: new Date().toISOString(),
    user_id: dappUser.user_id,
  })
}

const updateDeliveryAttempt = async (
  context: PassportDappContext,
  attemptId: string,
  patch: Record<string, unknown>
) => {
  const { error } = await context.supabase
    .from("notification_delivery_attempts")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", attemptId)

  if (error) {
    throw error
  }
}

const updateEventStatus = async (
  context: PassportDappContext,
  eventId: string,
  status: "queued" | "failed"
) => {
  const { error } = await context.supabase
    .from("notification_events")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)

  if (error) {
    throw error
  }
}

const deliverEmailIfAvailable = async (
  context: PassportDappContext,
  input: SendNotificationInput,
  channel: ChannelRow,
  eventId: string,
  attempt: DeliveryAttemptRow,
  userId: number | string
) => {
  if (channel.provider_key !== "email_smtp") {
    return
  }

  const attemptedAt = new Date().toISOString()

  try {
    const { data: destinationRow, error: destinationError } =
      await context.supabase
        .schema("private")
        .from("notification_channel_destinations")
        .select("*")
        .eq("channel_id", channel.id)
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle()

    if (destinationError) {
      throw destinationError
    }

    if (!destinationRow) {
      throw new Error("Email notification channel destination was not found.")
    }

    const toEmail = await decryptNotificationChannelDestination(
      context.supabase,
      destinationRow,
      {
        channelId: channel.id,
        channelType: "email",
        userId,
      }
    )

    await sendNotificationEmail({
      body: input.body,
      category: input.category,
      fromAppName: String(context.dapp.appname ?? `Dapp ${context.dapp.id}`),
      priority: input.priority,
      title: input.title,
      toEmail,
    })

    await updateDeliveryAttempt(context, attempt.id, {
      attempted_at: attemptedAt,
      completed_at: new Date().toISOString(),
      metadata: {
        provider: "email_smtp",
      },
      status: "sent",
    })
    await updateEventStatus(context, eventId, "queued")
  } catch (error) {
    await updateDeliveryAttempt(context, attempt.id, {
      attempted_at: attemptedAt,
      completed_at: new Date().toISOString(),
      error_code: "email_delivery_failed",
      error_message:
        error instanceof Error ? error.message : "Email delivery failed.",
      metadata: {
        provider: "email_smtp",
      },
      status: "failed",
    })
    await updateEventStatus(context, eventId, "failed")
  }
}

export async function sendNotificationForDapp(
  context: PassportDappContext,
  input: SendNotificationInput
): Promise<SendNotificationResult> {
  const { data: dappUser, error: dappUserError } = await context.supabase
    .from("dapp_users")
    .select("uuid,dapp_id,user_id")
    .eq("uuid", input.dappUserUuid)
    .eq("dapp_id", context.dapp.id)
    .maybeSingle()

  if (dappUserError) {
    throw dappUserError
  }

  if (!dappUser) {
    throw new ApiSecurityError(
      404,
      "not_found",
      "Dapp user was not found for the authenticated app."
    )
  }

  const typedDappUser = dappUser as DappUserRow

  try {
    const [policyResponse, grantResponse, preferenceResponse, channelResponse] =
      await Promise.all([
        context.supabase
          .from("notification_app_policies")
          .select("*")
          .eq("dapp_id", context.dapp.id)
          .maybeSingle(),
        context.supabase
          .from("notification_app_grants")
          .select("*")
          .eq("dapp_id", context.dapp.id)
          .eq("dapp_user_uuid", input.dappUserUuid)
          .eq("user_id", typedDappUser.user_id)
          .eq("category_key", input.category)
          .eq("status", "active")
          .maybeSingle(),
        context.supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", typedDappUser.user_id)
          .eq("category_key", input.category),
        context.supabase
          .from("user_notification_channels")
          .select("*")
          .eq("user_id", typedDappUser.user_id)
          .eq("status", "active")
          .eq("verification_status", "verified"),
      ])

    if (policyResponse.error) {
      throw policyResponse.error
    }
    if (grantResponse.error) {
      throw grantResponse.error
    }
    if (preferenceResponse.error) {
      throw preferenceResponse.error
    }
    if (channelResponse.error) {
      throw channelResponse.error
    }

    const policy = policyResponse.data as AppPolicyRow | null
    assertPolicyAllowsRequest(policy, input)
    assertActiveGrant(grantResponse.data as GrantRow | null)

    const preferences = (preferenceResponse.data ?? []) as PreferenceRow[]
    const appPreference =
      preferences.find(
        (preference) =>
          String(preference.dapp_id ?? "") === String(context.dapp.id) &&
          preference.status !== "revoked"
      ) ?? null
    const globalPreference =
      preferences.find(
        (preference) =>
          (preference.dapp_id === null || preference.dapp_id === undefined) &&
          preference.status !== "revoked"
      ) ?? null

    assertPreferenceAllowsDelivery(appPreference)
    assertPreferenceAllowsDelivery(globalPreference)

    const channel = selectEligibleChannel({
      allowedProviders: asStringArray(policy?.allowed_providers),
      appPreference,
      channels: (channelResponse.data ?? []) as ChannelRow[],
      globalPreference,
    })

    if (!channel) {
      throw new ApiSecurityError(
        403,
        "no_eligible_notification_channel",
        "The user does not have a verified eligible channel for this notification."
      )
    }

    const createdAt = new Date().toISOString()
    const { data: event, error: eventError } = await context.supabase
      .from("notification_events")
      .insert({
        body: input.body,
        category_key: input.category,
        dapp_id: context.dapp.id,
        dapp_user_uuid: input.dappUserUuid,
        deep_link: input.deepLink ?? null,
        metadata: input.metadata ?? {},
        priority: input.priority,
        request_id: input.requestId,
        selected_channel_id: channel.id,
        selected_channel_type: channel.channel_type,
        status: "accepted",
        title: input.title,
        updated_at: createdAt,
        user_id: typedDappUser.user_id,
      })
      .select("id,created_at")
      .single()

    if (eventError) {
      throw eventError
    }

    const eventRow = event as { created_at?: string; id: string }
    const { data: attempt, error: attemptError } = await context.supabase
      .from("notification_delivery_attempts")
      .insert({
        channel_id: channel.id,
        event_id: eventRow.id,
        metadata: {
          queuedBy: "api_v3_notifications_send",
        },
        provider_key: channel.provider_key,
        status: "queued",
      })
      .select("id")
      .single()

    if (attemptError) {
      throw attemptError
    }

    await deliverEmailIfAvailable(
      context,
      input,
      channel,
      eventRow.id,
      attempt as DeliveryAttemptRow,
      typedDappUser.user_id
    )

    return {
      category: input.category,
      createdAt: String(eventRow.created_at ?? createdAt),
      eventId: String(eventRow.id),
      priority: input.priority,
      selectedChannelType: String(channel.channel_type),
      status: "accepted",
    }
  } catch (error) {
    if (error instanceof ApiSecurityError) {
      await insertDeniedEvent(context, input, typedDappUser, error)
    }
    throw error
  }
}
