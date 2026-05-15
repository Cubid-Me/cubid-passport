import type { AdminRequestContext } from './adminApi';
import { getOwnedDappIds } from './adminApi';

const CATEGORIES = ['SECURITY', 'TRANSACTIONAL', 'WORKFLOW'] as const;
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'] as const;
const PROVIDERS = ['email_smtp', 'telegram_bot'] as const;
const POLICY_STATUSES = ['disabled', 'enabled', 'suspended'] as const;
const PROVIDER_STATUSES = ['active', 'disabled', 'suspended'] as const;
const CATEGORY_STATUSES = ['active', 'disabled'] as const;

type CategoryKey = (typeof CATEGORIES)[number];
type Priority = (typeof PRIORITIES)[number];
type ProviderKey = (typeof PROVIDERS)[number];
type PolicyStatus = (typeof POLICY_STATUSES)[number];
type ProviderStatus = (typeof PROVIDER_STATUSES)[number];
type CategoryStatus = (typeof CATEGORY_STATUSES)[number];

type DappRow = {
  appname?: string | null;
  id: number | string;
  uid?: string | null;
};

type CategoryRow = {
  category_key: string;
  default_priority?: string | null;
  description?: string | null;
  display_name?: string | null;
  marketing_like?: boolean | null;
  requires_explicit_grant?: boolean | null;
  status?: string | null;
  updated_at?: string | null;
};

type ProviderRow = {
  channel_type?: string | null;
  display_name?: string | null;
  metadata?: Record<string, unknown> | null;
  provider_key: string;
  status?: string | null;
  supports_delivery?: boolean | null;
  supports_verification?: boolean | null;
  updated_at?: string | null;
};

type AppPolicyRow = {
  allowed_categories?: string[] | null;
  allowed_priorities?: string[] | null;
  allowed_providers?: string[] | null;
  daily_limit?: number | null;
  dapp_id: number | string;
  id?: string | null;
  minute_limit?: number | null;
  policy_name?: string | null;
  policy_version?: number | null;
  sandbox_mode?: boolean | null;
  security_category_enabled?: boolean | null;
  status?: string | null;
  updated_at?: string | null;
};

type NotificationEventRow = {
  category_key?: string | null;
  created_at?: string | null;
  dapp_id?: number | string | null;
  denied_reason?: string | null;
  id?: string | null;
  priority?: string | null;
  selected_channel_type?: string | null;
  status?: string | null;
};

export class NotificationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotificationInputError';
  }
}

export const isNotificationInputError = (
  error: unknown
): error is NotificationInputError => error instanceof NotificationInputError;

export type NotificationAppPolicyInput = {
  allowedCategories: CategoryKey[];
  allowedPriorities: Priority[];
  allowedProviders: ProviderKey[];
  dailyLimit: number;
  dappId: number;
  minuteLimit: number;
  policyName: string;
  sandboxMode: boolean;
  securityCategoryEnabled: boolean;
  status: PolicyStatus;
};

export type NotificationProviderInput = {
  metadata?: Record<string, unknown>;
  providerKey: ProviderKey;
  status: ProviderStatus;
};

export type NotificationCategoryInput = {
  categoryKey: CategoryKey;
  defaultPriority: Priority;
  description?: string | null;
  displayName: string;
  status: CategoryStatus;
};

const uniqueStrings = <T extends string>(values: T[]) => [...new Set(values)];

const includesOnly = <T extends string>(allowed: readonly T[], values: T[]) =>
  values.every((value) => allowed.includes(value));

const mapCategory = (row: CategoryRow) => ({
  categoryKey: String(row.category_key),
  defaultPriority: String(row.default_priority ?? 'NORMAL'),
  description: row.description ?? null,
  displayName: String(row.display_name ?? row.category_key),
  marketingLike: Boolean(row.marketing_like),
  requiresExplicitGrant: row.requires_explicit_grant !== false,
  status: String(row.status ?? 'active'),
  updatedAt: row.updated_at ?? null,
});

const mapProvider = (row: ProviderRow) => ({
  channelType: row.channel_type ?? null,
  displayName: String(row.display_name ?? row.provider_key),
  metadata: row.metadata ?? {},
  providerKey: String(row.provider_key),
  status: String(row.status ?? 'disabled'),
  supportsDelivery: row.supports_delivery !== false,
  supportsVerification: row.supports_verification !== false,
  updatedAt: row.updated_at ?? null,
});

const defaultPolicy = (dapp: DappRow) => ({
  allowedCategories: [] as string[],
  allowedPriorities: ['LOW', 'NORMAL'],
  allowedProviders: [] as string[],
  dailyLimit: 0,
  dappId: Number(dapp.id),
  dappName: String(dapp.appname ?? `Dapp ${dapp.id}`),
  dappUid: dapp.uid ?? null,
  minuteLimit: 0,
  policyId: null as string | null,
  policyName: 'Default notification policy',
  policyVersion: 0,
  sandboxMode: true,
  securityCategoryEnabled: false,
  status: 'disabled',
  updatedAt: null as string | null,
});

const mapPolicy = (dapp: DappRow, row: AppPolicyRow | null) => {
  if (!row) {
    return defaultPolicy(dapp);
  }

  return {
    allowedCategories: row.allowed_categories ?? [],
    allowedPriorities: row.allowed_priorities ?? [],
    allowedProviders: row.allowed_providers ?? [],
    dailyLimit: Number(row.daily_limit ?? 0),
    dappId: Number(dapp.id),
    dappName: String(dapp.appname ?? `Dapp ${dapp.id}`),
    dappUid: dapp.uid ?? null,
    minuteLimit: Number(row.minute_limit ?? 0),
    policyId: row.id ?? null,
    policyName: String(row.policy_name ?? 'Default notification policy'),
    policyVersion: Number(row.policy_version ?? 1),
    sandboxMode: row.sandbox_mode !== false,
    securityCategoryEnabled: Boolean(row.security_category_enabled),
    status: String(row.status ?? 'disabled'),
    updatedAt: row.updated_at ?? null,
  };
};

const mapEvent = (row: NotificationEventRow) => ({
  categoryKey: row.category_key ?? null,
  createdAt: row.created_at ?? null,
  dappId: row.dapp_id === undefined || row.dapp_id === null ? null : Number(row.dapp_id),
  deniedReason: row.denied_reason ?? null,
  eventId: row.id ?? null,
  priority: row.priority ?? null,
  selectedChannelType: row.selected_channel_type ?? null,
  status: row.status ?? null,
});

const countBy = <TRow extends Record<string, unknown>>(
  rows: TRow[],
  column: keyof TRow
) =>
  rows.reduce<Record<string, number>>((counts, row) => {
    const key = String(row[column] ?? 'unknown');
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});

export async function loadNotificationAdminOverview(
  context: AdminRequestContext
) {
  const ownedDappIds = await getOwnedDappIds(context);

  const [
    categoriesResponse,
    providersResponse,
    dappsResponse,
    policiesResponse,
    eventsResponse,
    attemptsResponse,
  ] = await Promise.all([
    context.supabase.from('notification_categories').select('*'),
    context.supabase.from('notification_providers').select('*'),
    context.supabase
      .from('dapps')
      .select('id,appname,uid')
      .in('id', ownedDappIds),
    context.supabase
      .from('notification_app_policies')
      .select('*')
      .in('dapp_id', ownedDappIds),
    context.supabase
      .from('notification_events')
      .select('id,dapp_id,category_key,priority,status,selected_channel_type,denied_reason,created_at')
      .in('dapp_id', ownedDappIds)
      .order('created_at', { ascending: false })
      .limit(25),
    context.supabase
      .from('notification_delivery_attempts')
      .select('provider_key,status')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  const error =
    categoriesResponse.error ??
    providersResponse.error ??
    dappsResponse.error ??
    policiesResponse.error ??
    eventsResponse.error ??
    attemptsResponse.error;

  if (error) {
    throw error;
  }

  const policiesByDappId = new Map<number, AppPolicyRow>();
  for (const policy of (policiesResponse.data ?? []) as AppPolicyRow[]) {
    policiesByDappId.set(Number(policy.dapp_id), policy);
  }

  const events = ((eventsResponse.data ?? []) as NotificationEventRow[]).map(
    mapEvent
  );
  const attempts = (attemptsResponse.data ?? []) as Record<string, unknown>[];

  return {
    appPolicies: ((dappsResponse.data ?? []) as DappRow[]).map((dapp) =>
      mapPolicy(dapp, policiesByDappId.get(Number(dapp.id)) ?? null)
    ),
    categories: ((categoriesResponse.data ?? []) as CategoryRow[]).map(
      mapCategory
    ),
    generatedAt: new Date().toISOString(),
    providers: ((providersResponse.data ?? []) as ProviderRow[]).map(
      mapProvider
    ),
    recentEvents: events,
    totals: {
      attemptsByProvider: countBy(attempts, 'provider_key'),
      attemptsByStatus: countBy(attempts, 'status'),
      eventsByStatus: countBy(events as unknown as Record<string, unknown>[], 'status'),
    },
  };
}

export async function upsertNotificationProvider(
  context: AdminRequestContext,
  input: NotificationProviderInput
) {
  const payload = {
    metadata: input.metadata ?? {},
    status: input.status,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await context.supabase
    .from('notification_providers')
    .update(payload)
    .eq('provider_key', input.providerKey)
    .select()
    .single();

  if (error) {
    throw error;
  }

  await context.supabase.from('api_security_events').insert({
    actor_identifier: context.email,
    actor_type: 'admin',
    details: {
      providerKey: input.providerKey,
      status: input.status,
    },
    event_type: 'notification_provider.updated',
    outcome: 'success',
    request_id: context.requestId,
  });

  return mapProvider(data as ProviderRow);
}

export async function upsertNotificationCategory(
  context: AdminRequestContext,
  input: NotificationCategoryInput
) {
  const payload = {
    category_key: input.categoryKey,
    default_priority: input.defaultPriority,
    description: input.description ?? null,
    display_name: input.displayName,
    status: input.status,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await context.supabase
    .from('notification_categories')
    .upsert(payload, { onConflict: 'category_key' })
    .select()
    .single();

  if (error) {
    throw error;
  }

  await context.supabase.from('api_security_events').insert({
    actor_identifier: context.email,
    actor_type: 'admin',
    details: {
      categoryKey: input.categoryKey,
      status: input.status,
    },
    event_type: 'notification_category.updated',
    outcome: 'success',
    request_id: context.requestId,
  });

  return mapCategory(data as CategoryRow);
}

export async function upsertNotificationAppPolicy(
  context: AdminRequestContext,
  input: NotificationAppPolicyInput
) {
  const dappId = Number(input.dappId);
  const ownedIds = (await getOwnedDappIds(context)).map(Number);

  if (!ownedIds.includes(dappId)) {
    throw new NotificationInputError('Dapp was not found for this admin user.');
  }

  if (!includesOnly(CATEGORIES, input.allowedCategories)) {
    throw new NotificationInputError(
      'Notification policy contains an invalid category.'
    );
  }

  if (!includesOnly(PRIORITIES, input.allowedPriorities)) {
    throw new NotificationInputError(
      'Notification policy contains an invalid priority.'
    );
  }

  if (!includesOnly(PROVIDERS, input.allowedProviders)) {
    throw new NotificationInputError(
      'Notification policy contains an invalid provider.'
    );
  }

  if (
    input.allowedCategories.includes('SECURITY') &&
    !input.securityCategoryEnabled
  ) {
    throw new NotificationInputError(
      'Security notifications must be explicitly enabled.'
    );
  }

  const existingResponse = await context.supabase
    .from('notification_app_policies')
    .select('*')
    .eq('dapp_id', dappId)
    .maybeSingle();

  if (existingResponse.error) {
    throw existingResponse.error;
  }

  const existing = existingResponse.data as AppPolicyRow | null;
  const payload = {
    allowed_categories: uniqueStrings(input.allowedCategories),
    allowed_priorities: uniqueStrings(input.allowedPriorities),
    allowed_providers: uniqueStrings(input.allowedProviders),
    daily_limit: input.dailyLimit,
    dapp_id: dappId,
    minute_limit: input.minuteLimit,
    policy_name: input.policyName.trim(),
    policy_version: Number(existing?.policy_version ?? 0) + 1,
    sandbox_mode: input.sandboxMode,
    security_category_enabled: input.securityCategoryEnabled,
    status: input.status,
    updated_at: new Date().toISOString(),
  };

  const query = existing
    ? context.supabase
        .from('notification_app_policies')
        .update(payload)
        .eq('dapp_id', dappId)
    : context.supabase.from('notification_app_policies').insert(payload);

  const { data, error } = await query.select().single();

  if (error) {
    throw error;
  }

  const eventType =
    input.status === 'suspended'
      ? 'notification_app_policy.suspended'
      : existing
        ? 'notification_app_policy.updated'
        : 'notification_app_policy.created';

  await context.supabase.from('api_security_events').insert({
    actor_identifier: context.email,
    actor_type: 'admin',
    details: {
      dappId,
      policyVersion: payload.policy_version,
      status: input.status,
    },
    event_type: eventType,
    outcome: 'success',
    request_id: context.requestId,
  });

  const dapp = await context.supabase
    .from('dapps')
    .select('id,appname,uid')
    .eq('id', dappId)
    .maybeSingle();

  if (dapp.error) {
    throw dapp.error;
  }

  return mapPolicy(dapp.data as DappRow, data as AppPolicyRow);
}
