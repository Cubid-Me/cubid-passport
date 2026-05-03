import type { SupabaseClient } from '@supabase/supabase-js';

type AdminSupabaseClient = SupabaseClient;

const MAX_RECENT_GRANT_ROWS = 500;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface DisclosureGrantRow {
  app_scoped_subject_id: string;
  consent_version: number;
  created_at: string;
  dapp_id: number | null;
  granted_at: string;
  granted_claims: unknown;
  granted_scopes: unknown;
  id: string;
  metadata: unknown;
  oidc_client_id: string | null;
  policy_version: string;
  revoked_at: string | null;
  revoked_by: string | null;
  source: string;
  status: string;
  updated_at: string;
}

interface DisclosureEventRow {
  actor_identifier: string | null;
  actor_type: string;
  created_at: string;
  details: unknown;
  event_type: string;
  outcome: string;
  request_id: string | null;
}

interface GrantTotalRow {
  grant_count: number | string | null;
  source: string;
  status: string;
}

interface ActiveSubjectCountRow {
  active_subject_count: number | string | null;
}

interface RecentEventCountRow {
  event_count: number | string | null;
}

interface DappSummaryRow {
  active_grant_count: number | string | null;
  active_subject_count: number | string | null;
  app_name: string;
  dapp_id: number | string;
  last_granted_at: string | null;
  last_revoked_at: string | null;
  revoked_grant_count: number | string | null;
  sources: unknown;
}

interface OidcClientSummaryRow {
  active_grant_count: number | string | null;
  client_id: string;
  client_name: string;
  last_granted_at: string | null;
  last_revoked_at: string | null;
  revoked_grant_count: number | string | null;
  sources: unknown;
}

export interface DisclosureOpsEvent {
  actorType: string;
  createdAt: string;
  details: Record<string, unknown>;
  eventType: string;
  outcome: string;
  requestId: string | null;
}

export interface DisclosureOpsGrantSample {
  claimCount: number;
  consentVersion: number;
  grantedAt: string;
  policyVersion: string;
  revokedAt: string | null;
  scopeCount: number;
  source: string;
  status: string;
}

export interface DisclosureOpsDappSummary {
  activeGrantCount: number;
  activeSubjectCount: number;
  appName: string;
  dappId: number;
  lastGrantedAt: string | null;
  lastRevokedAt: string | null;
  recentGrants: DisclosureOpsGrantSample[];
  revokedGrantCount: number;
  sources: Record<string, number>;
}

export interface DisclosureOpsOidcClientSummary {
  activeGrantCount: number;
  clientId: string;
  clientName: string;
  lastGrantedAt: string | null;
  lastRevokedAt: string | null;
  recentGrants: DisclosureOpsGrantSample[];
  revokedGrantCount: number;
  sources: Record<string, number>;
}

export interface DisclosureOpsOverview {
  dapps: DisclosureOpsDappSummary[];
  generatedAt: string;
  oidcClients: DisclosureOpsOidcClientSummary[];
  recentEvents: DisclosureOpsEvent[];
  totals: {
    activeGrants: number;
    activeSubjects: number;
    grantsBySource: Record<string, number>;
    grantsByStatus: Record<string, number>;
    recentGrantSamples: number;
    recentGrantEvents7d: number;
    revokedGrants: number;
  };
}

const normalizeDetails = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  const details = value as Record<string, unknown>;
  const redacted: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(details)) {
    redacted[key] =
      key === 'human_subject_key' ||
      key === 'cubid_user_id' ||
      key === 'app_scoped_subject_id' ||
      key === 'disclosure_grant_id' ||
      key === 'dapp_user_uuid'
        ? '[redacted]'
        : entry;
  }

  return redacted;
};

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];

const normalizeClaimCount = (value: unknown) =>
  Array.isArray(value) ? value.length : 0;

const normalizeCount = (value: number | string | null | undefined) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const normalizeSourceCounts = (value: unknown): Record<string, number> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([source, count]) => [
      source,
      normalizeCount(count as number | string | null | undefined),
    ])
  );
};

const mapGrantSample = (row: DisclosureGrantRow): DisclosureOpsGrantSample => ({
  claimCount: normalizeClaimCount(row.granted_claims),
  consentVersion: row.consent_version,
  grantedAt: row.granted_at,
  policyVersion: row.policy_version,
  revokedAt: row.revoked_at,
  scopeCount: normalizeStringArray(row.granted_scopes).length,
  source: row.source,
  status: row.status,
});

const mapEvent = (row: DisclosureEventRow): DisclosureOpsEvent => ({
  actorType: row.actor_type,
  createdAt: row.created_at,
  details: normalizeDetails(row.details),
  eventType: row.event_type,
  outcome: row.outcome,
  requestId: row.request_id,
});

export const buildDisclosureOpsOverview = ({
  activeSubjectCount,
  dappSummaries,
  events,
  grantTotals,
  generatedAt,
  oidcClientSummaries,
  recentEventCount,
  recentGrants,
}: {
  activeSubjectCount: number;
  dappSummaries: DappSummaryRow[];
  events: DisclosureEventRow[];
  grantTotals: GrantTotalRow[];
  generatedAt: string;
  oidcClientSummaries: OidcClientSummaryRow[];
  recentEventCount: number;
  recentGrants: DisclosureGrantRow[];
}): DisclosureOpsOverview => {
  const grantsBySource: Record<string, number> = {};
  const grantsByStatus: Record<string, number> = {};
  const recentGrantsByDapp = new Map<number, DisclosureOpsGrantSample[]>();
  const recentGrantsByClient = new Map<string, DisclosureOpsGrantSample[]>();

  for (const total of grantTotals) {
    const count = normalizeCount(total.grant_count);
    grantsBySource[total.source] = (grantsBySource[total.source] ?? 0) + count;
    grantsByStatus[total.status] = (grantsByStatus[total.status] ?? 0) + count;
  }

  for (const row of recentGrants) {
    const sample = mapGrantSample(row);
    if (row.dapp_id !== null) {
      const samples = recentGrantsByDapp.get(row.dapp_id) ?? [];
      if (samples.length < 5) {
        samples.push(sample);
      }
      recentGrantsByDapp.set(row.dapp_id, samples);
    }

    if (row.oidc_client_id) {
      const samples = recentGrantsByClient.get(row.oidc_client_id) ?? [];
      if (samples.length < 5) {
        samples.push(sample);
      }
      recentGrantsByClient.set(row.oidc_client_id, samples);
    }
  }

  return {
    dapps: dappSummaries.map((row) => ({
      activeGrantCount: normalizeCount(row.active_grant_count),
      activeSubjectCount: normalizeCount(row.active_subject_count),
      appName: row.app_name,
      dappId: Number(row.dapp_id),
      lastGrantedAt: row.last_granted_at,
      lastRevokedAt: row.last_revoked_at,
      recentGrants: recentGrantsByDapp.get(Number(row.dapp_id)) ?? [],
      revokedGrantCount: normalizeCount(row.revoked_grant_count),
      sources: normalizeSourceCounts(row.sources),
    })).sort(
      (left, right) => right.activeGrantCount - left.activeGrantCount
    ),
    generatedAt,
    oidcClients: oidcClientSummaries.map((row) => ({
      activeGrantCount: normalizeCount(row.active_grant_count),
      clientId: row.client_id,
      clientName: row.client_name,
      lastGrantedAt: row.last_granted_at,
      lastRevokedAt: row.last_revoked_at,
      recentGrants: recentGrantsByClient.get(row.client_id) ?? [],
      revokedGrantCount: normalizeCount(row.revoked_grant_count),
      sources: normalizeSourceCounts(row.sources),
    })).sort(
      (left, right) => right.activeGrantCount - left.activeGrantCount
    ),
    recentEvents: events.map(mapEvent).slice(0, 50),
    totals: {
      activeGrants: grantsByStatus.active ?? 0,
      activeSubjects: activeSubjectCount,
      grantsBySource,
      grantsByStatus,
      recentGrantEvents7d: recentEventCount,
      recentGrantSamples: recentGrants.length,
      revokedGrants: grantsByStatus.revoked ?? 0,
    },
  };
};

export const loadDisclosureOpsOverview = async (
  supabase: AdminSupabaseClient
): Promise<DisclosureOpsOverview> => {
  const generatedAt = new Date().toISOString();
  const since = new Date(
    new Date(generatedAt).getTime() - SEVEN_DAYS_MS
  ).toISOString();
  const [
    recentGrantsResponse,
    eventsResponse,
    grantTotalsResponse,
    activeSubjectCountResponse,
    recentEventCountResponse,
    dappSummariesResponse,
    oidcClientSummariesResponse,
  ] = await Promise.all([
    supabase
      .from('selective_disclosure_grants')
      .select(
        'id,app_scoped_subject_id,dapp_id,oidc_client_id,source,granted_scopes,granted_claims,policy_version,consent_version,status,granted_at,revoked_at,revoked_by,metadata,created_at,updated_at'
      )
      .order('updated_at', { ascending: false })
      .limit(MAX_RECENT_GRANT_ROWS),
    supabase
      .from('selective_disclosure_events')
      .select('event_type,actor_type,actor_identifier,request_id,outcome,details,created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.rpc('get_disclosure_ops_grant_totals'),
    supabase.rpc('get_disclosure_ops_active_subject_count'),
    supabase.rpc('get_disclosure_ops_recent_event_count', { p_since: since }),
    supabase.rpc('get_disclosure_ops_dapp_summaries'),
    supabase.rpc('get_disclosure_ops_oidc_client_summaries'),
  ]);

  for (const response of [
    recentGrantsResponse,
    eventsResponse,
    grantTotalsResponse,
    activeSubjectCountResponse,
    recentEventCountResponse,
    dappSummariesResponse,
    oidcClientSummariesResponse,
  ]) {
    if (response.error) {
      throw response.error;
    }
  }

  return buildDisclosureOpsOverview({
    activeSubjectCount: normalizeCount(
      ((activeSubjectCountResponse.data ?? []) as ActiveSubjectCountRow[])[0]
        ?.active_subject_count
    ),
    dappSummaries: (dappSummariesResponse.data ?? []) as DappSummaryRow[],
    events: (eventsResponse.data ?? []) as DisclosureEventRow[],
    grantTotals: (grantTotalsResponse.data ?? []) as GrantTotalRow[],
    generatedAt,
    oidcClientSummaries: (oidcClientSummariesResponse.data ??
      []) as OidcClientSummaryRow[],
    recentEventCount: normalizeCount(
      ((recentEventCountResponse.data ?? []) as RecentEventCountRow[])[0]
        ?.event_count
    ),
    recentGrants: (recentGrantsResponse.data ?? []) as DisclosureGrantRow[],
  });
};
