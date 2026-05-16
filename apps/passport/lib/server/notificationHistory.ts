import { ApiSecurityError } from "@cubid/auth/server"

import type {
  PassportDappContext,
  PassportUserContext,
} from "./passportApi"

type UserRow = {
  id: number | string
}

type NotificationEventRow = {
  body?: string | null
  category_key?: string | null
  created_at?: string | null
  dapp_id?: number | string | null
  dapp_user_uuid?: string | null
  deep_link?: string | null
  denied_reason?: string | null
  id: string
  metadata?: Record<string, unknown> | null
  priority?: string | null
  request_id?: string | null
  selected_channel_id?: string | null
  selected_channel_type?: string | null
  status?: string | null
  title?: string | null
  updated_at?: string | null
  user_id?: number | string | null
}

type DeliveryAttemptRow = {
  attempt_number?: number | null
  completed_at?: string | null
  created_at?: string | null
  error_code?: string | null
  event_id?: string | null
  id: string
  provider_key?: string | null
  status?: string | null
  updated_at?: string | null
}

type DappRow = {
  appname?: string | null
  id: number | string
  uid?: string | null
}

type ChannelRow = {
  channel_type?: string | null
  display_hint?: string | null
  id: string
  label?: string | null
  provider_key?: string | null
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const resolvePassportUserId = async (context: PassportUserContext) => {
  const identities = [
    context.firebaseToken.email
      ? { column: "email", value: normalizeEmail(context.firebaseToken.email) }
      : null,
    context.firebaseToken.phone_number
      ? { column: "phone", value: context.firebaseToken.phone_number }
      : null,
  ].filter(Boolean) as Array<{ column: string; value: string }>

  for (const identity of identities) {
    const { data, error } = await context.supabase
      .from("users")
      .select("id")
      .eq(identity.column, identity.value)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (data?.id !== undefined && data?.id !== null) {
      return String((data as UserRow).id)
    }
  }

  return null
}

const mapAttempts = (attempts: DeliveryAttemptRow[]) =>
  attempts.map((attempt) => ({
    attemptId: String(attempt.id),
    attemptNumber: Number(attempt.attempt_number ?? 1),
    completedAt: attempt.completed_at ?? null,
    createdAt: attempt.created_at ?? null,
    errorCode: attempt.error_code ?? null,
    providerKey: attempt.provider_key ?? null,
    status: attempt.status ?? null,
    updatedAt: attempt.updated_at ?? null,
  }))

const attemptSortKey = (attempt: DeliveryAttemptRow) => ({
  attemptNumber: Number(attempt.attempt_number ?? 0),
  createdAt: attempt.created_at ?? "",
  id: String(attempt.id),
})

const sortAttempts = (attempts: DeliveryAttemptRow[]) =>
  [...attempts].sort((left, right) => {
    const leftKey = attemptSortKey(left)
    const rightKey = attemptSortKey(right)

    return (
      leftKey.attemptNumber - rightKey.attemptNumber ||
      leftKey.createdAt.localeCompare(rightKey.createdAt) ||
      leftKey.id.localeCompare(rightKey.id)
    )
  })

const groupByEventId = (attempts: DeliveryAttemptRow[]) => {
  const grouped = new Map<string, DeliveryAttemptRow[]>()

  for (const attempt of attempts) {
    const eventId = String(attempt.event_id ?? "")
    if (!eventId) {
      continue
    }
    grouped.set(
      eventId,
      sortAttempts([...(grouped.get(eventId) ?? []), attempt])
    )
  }

  return grouped
}

const latestAttemptStatus = (attempts: DeliveryAttemptRow[]) =>
  attempts[attempts.length - 1]?.status ?? null

const safeMetadata = (metadata: unknown) =>
  metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {}

export async function listNotificationHistoryForUser(
  context: PassportUserContext,
  input: { limit?: number }
) {
  const userId = await resolvePassportUserId(context)

  if (!userId) {
    return []
  }

  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100)

  const { data: eventsData, error: eventsError } = await context.supabase
    .from("notification_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (eventsError) {
    throw eventsError
  }

  const events = (eventsData ?? []) as NotificationEventRow[]
  const eventIds = events.map((event) => String(event.id))
  const dappIds = [
    ...new Set(
      events
        .map((event) => event.dapp_id)
        .filter((value) => value !== null && value !== undefined)
        .map(String)
    ),
  ]
  const channelIds = [
    ...new Set(
      events
        .map((event) => event.selected_channel_id)
        .filter(Boolean)
        .map(String)
    ),
  ]

  const [attemptsResponse, dappsResponse, channelsResponse] = await Promise.all([
    eventIds.length > 0
      ? context.supabase
          .from("notification_delivery_attempts")
          .select("*")
          .in("event_id", eventIds)
          .order("attempt_number", { ascending: true })
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    dappIds.length > 0
      ? context.supabase.from("dapps").select("id,appname,uid").in("id", dappIds)
      : Promise.resolve({ data: [], error: null }),
    channelIds.length > 0
      ? context.supabase
          .from("user_notification_channels")
          .select("id,channel_type,provider_key,label,display_hint")
          .in("id", channelIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (attemptsResponse.error) {
    throw attemptsResponse.error
  }
  if (dappsResponse.error) {
    throw dappsResponse.error
  }
  if (channelsResponse.error) {
    throw channelsResponse.error
  }

  const attemptsByEvent = groupByEventId(
    (attemptsResponse.data ?? []) as DeliveryAttemptRow[]
  )
  const dappsById = new Map(
    ((dappsResponse.data ?? []) as DappRow[]).map((dapp) => [
      String(dapp.id),
      dapp,
    ])
  )
  const channelsById = new Map(
    ((channelsResponse.data ?? []) as ChannelRow[]).map((channel) => [
      String(channel.id),
      channel,
    ])
  )

  return events.map((event) => {
    const attempts = attemptsByEvent.get(String(event.id)) ?? []
    const dapp = event.dapp_id ? dappsById.get(String(event.dapp_id)) : null
    const channel = event.selected_channel_id
      ? channelsById.get(String(event.selected_channel_id))
      : null

    return {
      app: {
        appName: dapp?.appname ?? null,
        dappId: event.dapp_id ? String(event.dapp_id) : null,
        dappUid: dapp?.uid ?? null,
      },
      body: event.body ?? null,
      category: event.category_key ?? null,
      createdAt: event.created_at ?? null,
      deepLink: event.deep_link ?? null,
      deliveryAttempts: mapAttempts(attempts),
      deliveryStatus: latestAttemptStatus(attempts),
      deniedReason: event.denied_reason ?? null,
      eventId: String(event.id),
      metadata: safeMetadata(event.metadata),
      priority: event.priority ?? null,
      selectedChannel: channel
        ? {
            channelId: String(channel.id),
            channelType: channel.channel_type ?? null,
            displayHint: channel.display_hint ?? null,
            label: channel.label ?? null,
            providerKey: channel.provider_key ?? null,
          }
        : null,
      status: event.status ?? null,
      title: event.title ?? null,
      updatedAt: event.updated_at ?? null,
    }
  })
}

export async function getNotificationStatusForDapp(
  context: PassportDappContext,
  input: { dappUserUuid: string; eventId: string }
) {
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

  const { data: event, error: eventError } = await context.supabase
    .from("notification_events")
    .select("*")
    .eq("id", input.eventId)
    .eq("dapp_id", context.dapp.id)
    .eq("dapp_user_uuid", input.dappUserUuid)
    .maybeSingle()

  if (eventError) {
    throw eventError
  }

  if (!event) {
    throw new ApiSecurityError(
      404,
      "not_found",
      "Notification event was not found for the authenticated app."
    )
  }

  const typedEvent = event as NotificationEventRow
  const { data: attempts, error: attemptsError } = await context.supabase
    .from("notification_delivery_attempts")
    .select("*")
    .eq("event_id", input.eventId)
    .order("attempt_number", { ascending: true })
    .order("created_at", { ascending: true })

  if (attemptsError) {
    throw attemptsError
  }

  const sortedAttempts = sortAttempts((attempts ?? []) as DeliveryAttemptRow[])
  const deliveryAttempts = mapAttempts(sortedAttempts)

  return {
    category: typedEvent.category_key ?? null,
    createdAt: typedEvent.created_at ?? null,
    deliveryAttempts,
    deliveryStatus: latestAttemptStatus(sortedAttempts),
    deniedReason: typedEvent.denied_reason ?? null,
    eventId: String(typedEvent.id),
    priority: typedEvent.priority ?? null,
    selectedChannelType: typedEvent.selected_channel_type ?? null,
    status: typedEvent.status ?? null,
    title: typedEvent.title ?? null,
    updatedAt: typedEvent.updated_at ?? null,
  }
}
