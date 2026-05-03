import type { SupabaseClient } from '@supabase/supabase-js';

type AdminSupabaseClient = SupabaseClient;

const MAX_GRANT_ROWS = 5000;
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

interface AppScopedSubjectRow {
  app_identifier: string;
  dapp_id: number | null;
  id: string;
  status: string;
  subject_type: string;
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

interface DappRow {
  appname: string;
  id: number;
}

interface OidcClientRow {
  client_id: string;
  client_name: string;
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
    grantRowsScanned: number;
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

const increment = (target: Record<string, number>, key: string) => {
  target[key] = (target[key] ?? 0) + 1;
};

const maxTimestamp = (current: string | null, next: string | null) => {
  if (!next) {
    return current;
  }

  if (!current) {
    return next;
  }

  return next > current ? next : current;
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

const makeDappSummary = (dapp: DappRow): DisclosureOpsDappSummary => ({
  activeGrantCount: 0,
  activeSubjectCount: 0,
  appName: dapp.appname,
  dappId: dapp.id,
  lastGrantedAt: null,
  lastRevokedAt: null,
  recentGrants: [],
  revokedGrantCount: 0,
  sources: {},
});

const makeOidcClientSummary = (
  client: OidcClientRow
): DisclosureOpsOidcClientSummary => ({
  activeGrantCount: 0,
  clientId: client.client_id,
  clientName: client.client_name,
  lastGrantedAt: null,
  lastRevokedAt: null,
  recentGrants: [],
  revokedGrantCount: 0,
  sources: {},
});

export const buildDisclosureOpsOverview = ({
  clients,
  dapps,
  events,
  generatedAt,
  grants,
  subjects,
}: {
  clients: OidcClientRow[];
  dapps: DappRow[];
  events: DisclosureEventRow[];
  generatedAt: string;
  grants: DisclosureGrantRow[];
  subjects: AppScopedSubjectRow[];
}): DisclosureOpsOverview => {
  const dappsById = new Map(dapps.map((dapp) => [dapp.id, dapp]));
  const clientsById = new Map(clients.map((client) => [client.client_id, client]));
  const dappSummaries = new Map<number, DisclosureOpsDappSummary>();
  const clientSummaries = new Map<string, DisclosureOpsOidcClientSummary>();
  const activeSubjectIdsByDapp = new Map<number, Set<string>>();
  const activeSubjects = new Set<string>();
  const grantsBySource: Record<string, number> = {};
  const grantsByStatus: Record<string, number> = {};

  for (const subject of subjects) {
    if (subject.status !== 'active') {
      continue;
    }

    activeSubjects.add(subject.id);

    if (subject.dapp_id !== null) {
      const subjectIds = activeSubjectIdsByDapp.get(subject.dapp_id) ?? new Set();
      subjectIds.add(subject.id);
      activeSubjectIdsByDapp.set(subject.dapp_id, subjectIds);
    }
  }

  for (const row of grants) {
    increment(grantsBySource, row.source);
    increment(grantsByStatus, row.status);

    const sample = mapGrantSample(row);
    if (row.dapp_id !== null) {
      const dapp = dappsById.get(row.dapp_id) ?? {
        appname: `Dapp ${row.dapp_id}`,
        id: row.dapp_id,
      };
      const summary = dappSummaries.get(row.dapp_id) ?? makeDappSummary(dapp);

      if (row.status === 'active') {
        summary.activeGrantCount += 1;
      } else if (row.status === 'revoked') {
        summary.revokedGrantCount += 1;
      }

      increment(summary.sources, row.source);
      summary.lastGrantedAt = maxTimestamp(summary.lastGrantedAt, row.granted_at);
      summary.lastRevokedAt = maxTimestamp(summary.lastRevokedAt, row.revoked_at);
      if (summary.recentGrants.length < 5) {
        summary.recentGrants.push(sample);
      }
      dappSummaries.set(row.dapp_id, summary);
    }

    if (row.oidc_client_id) {
      const client = clientsById.get(row.oidc_client_id) ?? {
        client_id: row.oidc_client_id,
        client_name: row.oidc_client_id,
      };
      const summary =
        clientSummaries.get(row.oidc_client_id) ?? makeOidcClientSummary(client);

      if (row.status === 'active') {
        summary.activeGrantCount += 1;
      } else if (row.status === 'revoked') {
        summary.revokedGrantCount += 1;
      }

      increment(summary.sources, row.source);
      summary.lastGrantedAt = maxTimestamp(summary.lastGrantedAt, row.granted_at);
      summary.lastRevokedAt = maxTimestamp(summary.lastRevokedAt, row.revoked_at);
      if (summary.recentGrants.length < 5) {
        summary.recentGrants.push(sample);
      }
      clientSummaries.set(row.oidc_client_id, summary);
    }
  }

  for (const [dappId, summary] of dappSummaries) {
    summary.activeSubjectCount = activeSubjectIdsByDapp.get(dappId)?.size ?? 0;
  }

  const since = new Date(
    new Date(generatedAt).getTime() - SEVEN_DAYS_MS
  ).toISOString();

  return {
    dapps: [...dappSummaries.values()].sort(
      (left, right) => right.activeGrantCount - left.activeGrantCount
    ),
    generatedAt,
    oidcClients: [...clientSummaries.values()].sort(
      (left, right) => right.activeGrantCount - left.activeGrantCount
    ),
    recentEvents: events.map(mapEvent).slice(0, 50),
    totals: {
      activeGrants: grantsByStatus.active ?? 0,
      activeSubjects: activeSubjects.size,
      grantsBySource,
      grantsByStatus,
      grantRowsScanned: grants.length,
      recentGrantEvents7d: events.filter((event) => event.created_at >= since)
        .length,
      revokedGrants: grantsByStatus.revoked ?? 0,
    },
  };
};

export const loadDisclosureOpsOverview = async (
  supabase: AdminSupabaseClient
): Promise<DisclosureOpsOverview> => {
  const generatedAt = new Date().toISOString();
  const [
    grantsResponse,
    subjectsResponse,
    eventsResponse,
    dappsResponse,
    clientsResponse,
  ] = await Promise.all([
    supabase
      .from('selective_disclosure_grants')
      .select(
        'id,app_scoped_subject_id,dapp_id,oidc_client_id,source,granted_scopes,granted_claims,policy_version,consent_version,status,granted_at,revoked_at,revoked_by,metadata,created_at,updated_at'
      )
      .order('updated_at', { ascending: false })
      .limit(MAX_GRANT_ROWS),
    supabase
      .from('app_scoped_subjects')
      .select('id,subject_type,app_identifier,dapp_id,status'),
    supabase
      .from('selective_disclosure_events')
      .select('event_type,actor_type,actor_identifier,request_id,outcome,details,created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('dapps').select('id,appname'),
    supabase.from('oidc_clients').select('client_id,client_name'),
  ]);

  for (const response of [
    grantsResponse,
    subjectsResponse,
    eventsResponse,
    dappsResponse,
    clientsResponse,
  ]) {
    if (response.error) {
      throw response.error;
    }
  }

  return buildDisclosureOpsOverview({
    clients: (clientsResponse.data ?? []) as OidcClientRow[],
    dapps: (dappsResponse.data ?? []) as DappRow[],
    events: (eventsResponse.data ?? []) as DisclosureEventRow[],
    generatedAt,
    grants: (grantsResponse.data ?? []) as DisclosureGrantRow[],
    subjects: (subjectsResponse.data ?? []) as AppScopedSubjectRow[],
  });
};
