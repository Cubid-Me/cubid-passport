import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

import type { AdminRequestContext } from './adminApi';

type AdminSupabaseClient = SupabaseClient;

const CLIENT_OPS_STATUSES = ['active', 'suspended'] as const;
const RATE_LIMIT_TIERS = ['starter', 'trusted', 'internal'] as const;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

type ClientOpsStatus = (typeof CLIENT_OPS_STATUSES)[number];
type RateLimitTier = (typeof RATE_LIMIT_TIERS)[number];

interface ClientOpsRow {
  allowed_scopes: unknown;
  client_id: string;
  client_name: string;
  client_type: string;
  created_at: string;
  default_scopes: unknown;
  grant_types: unknown;
  post_logout_redirect_uris: unknown;
  rate_limit_tier: RateLimitTier;
  redirect_uris: unknown;
  status: string;
  suspended_at: string | null;
  token_endpoint_auth_method: string;
  updated_at: string;
  verification_status: string;
}

interface AuditLogRow {
  actor_identifier: string | null;
  actor_type: string;
  client_id: string | null;
  created_at: string;
  details: unknown;
  event_type: string;
  outcome: string;
  request_id: string | null;
}

interface BindingRow {
  archived_at: string | null;
  claim_name: string;
  client_id: string;
  enabled: boolean;
  policy_id: string | null;
}

interface PolicyRow {
  policy_id: string;
  policy_name: string;
}

interface ClientCountRow {
  active_consent_count: number | string | null;
  active_token_count: number | string | null;
  client_id: string;
}

export interface OidcOpsAuditEvent {
  actorType: string;
  clientId: string | null;
  createdAt: string;
  details: Record<string, unknown>;
  eventType: string;
  outcome: string;
  requestId: string | null;
}

export interface OidcOpsClientSummary {
  activeConsentCount: number;
  activeTokenCount: number;
  allowedScopes: string[];
  bindings: Array<{
    claimName: string;
    enabled: boolean;
    policyId: string | null;
    policyName: string | null;
  }>;
  clientId: string;
  clientName: string;
  clientType: string;
  createdAt: string;
  defaultScopes: string[];
  grantTypes: string[];
  metrics7d: {
    tokenFailures: number;
    tokenSuccesses: number;
    userinfoFailures: number;
    userinfoSuccesses: number;
  };
  postLogoutRedirectUris: string[];
  rateLimitTier: RateLimitTier;
  recentAuditEvents: OidcOpsAuditEvent[];
  redirectUris: string[];
  status: string;
  suspendedAt: string | null;
  tokenEndpointAuthMethod: string;
  updatedAt: string;
  verificationStatus: string;
}

export interface OidcOpsOverview {
  clients: OidcOpsClientSummary[];
  generatedAt: string;
  recentAuditEvents: OidcOpsAuditEvent[];
}

export interface ClientOpsUpdateInput {
  clientId: string;
  rateLimitTier?: RateLimitTier;
  status?: ClientOpsStatus;
}

class OidcOpsInputError extends Error {}

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
};

const normalizeDetails = (value: unknown): Record<string, unknown> => {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
};

const mapAuditEvent = (row: AuditLogRow): OidcOpsAuditEvent => ({
  actorType: row.actor_type,
  clientId: row.client_id,
  createdAt: row.created_at,
  details: normalizeDetails(row.details),
  eventType: row.event_type,
  outcome: row.outcome,
  requestId: row.request_id,
});

const isClientOpsStatus = (value: unknown): value is ClientOpsStatus => {
  return (
    typeof value === 'string' &&
    CLIENT_OPS_STATUSES.includes(value as ClientOpsStatus)
  );
};

const isRateLimitTier = (value: unknown): value is RateLimitTier => {
  return (
    typeof value === 'string' &&
    RATE_LIMIT_TIERS.includes(value as RateLimitTier)
  );
};

export const normalizeClientOpsUpdateInput = (
  body: unknown
): ClientOpsUpdateInput => {
  const input =
    typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const clientId =
    typeof input.clientId === 'string' ? input.clientId.trim() : '';
  const status = input.status;
  const rateLimitTier = input.rateLimitTier;

  if (!clientId) {
    throw new OidcOpsInputError('clientId is required');
  }

  if (status !== undefined && !isClientOpsStatus(status)) {
    throw new OidcOpsInputError('status must be active or suspended');
  }

  if (rateLimitTier !== undefined && !isRateLimitTier(rateLimitTier)) {
    throw new OidcOpsInputError(
      'rateLimitTier must be starter, trusted, or internal'
    );
  }

  if (status === undefined && rateLimitTier === undefined) {
    throw new OidcOpsInputError('status or rateLimitTier is required');
  }

  return {
    clientId,
    ...(status !== undefined ? { status } : {}),
    ...(rateLimitTier !== undefined ? { rateLimitTier } : {}),
  };
};

const makeEmptyMetrics = () => ({
  tokenFailures: 0,
  tokenSuccesses: 0,
  userinfoFailures: 0,
  userinfoSuccesses: 0,
});

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

export const normalizeClientCountRows = (rows: ClientCountRow[] = []) => {
  const countsByClient = new Map<
    string,
    { activeConsentCount: number; activeTokenCount: number }
  >();

  for (const row of rows) {
    countsByClient.set(row.client_id, {
      activeConsentCount: normalizeCount(row.active_consent_count),
      activeTokenCount: normalizeCount(row.active_token_count),
    });
  }

  return countsByClient;
};

const addAuditMetric = (
  metricsByClient: Map<string, ReturnType<typeof makeEmptyMetrics>>,
  row: AuditLogRow
) => {
  if (!row.client_id) {
    return;
  }

  const metrics = metricsByClient.get(row.client_id) ?? makeEmptyMetrics();

  if (row.event_type === 'token.issued' && row.outcome === 'success') {
    metrics.tokenSuccesses += 1;
  }

  if (row.event_type === 'token.exchange_failed') {
    metrics.tokenFailures += 1;
  }

  if (row.event_type === 'userinfo.returned' && row.outcome === 'success') {
    metrics.userinfoSuccesses += 1;
  }

  if (row.event_type === 'userinfo.failed') {
    metrics.userinfoFailures += 1;
  }

  metricsByClient.set(row.client_id, metrics);
};

export const loadOidcOpsOverview = async (
  supabase: AdminSupabaseClient
): Promise<OidcOpsOverview> => {
  const now = new Date();
  const generatedAt = now.toISOString();
  const since = new Date(now.getTime() - SEVEN_DAYS_MS).toISOString();

  const [
    clientsResponse,
    auditResponse,
    countsResponse,
    bindingsResponse,
    policiesResponse,
  ] = await Promise.all([
    supabase
      .from('oidc_clients')
      .select(
        'client_id,client_name,client_type,status,verification_status,token_endpoint_auth_method,redirect_uris,post_logout_redirect_uris,grant_types,default_scopes,allowed_scopes,rate_limit_tier,created_at,updated_at,suspended_at'
      )
      .order('client_name', { ascending: true }),
    supabase
      .from('oidc_audit_logs')
      .select(
        'client_id,event_type,actor_type,actor_identifier,request_id,outcome,details,created_at'
      )
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.rpc('get_oidc_ops_client_counts', { p_now: generatedAt }),
    supabase
      .from('oidc_client_claim_policy_bindings')
      .select('client_id,claim_name,policy_id,enabled,archived_at')
      .is('archived_at', null),
    supabase
      .from('oidc_identity_depth_policies')
      .select('policy_id,policy_name'),
  ]);

  for (const response of [
    clientsResponse,
    auditResponse,
    countsResponse,
    bindingsResponse,
    policiesResponse,
  ]) {
    if (response.error) {
      throw response.error;
    }
  }

  const recentAuditRows = (auditResponse.data ?? []) as AuditLogRow[];
  const recentAuditEvents = recentAuditRows.map(mapAuditEvent);
  const metricsByClient = new Map<
    string,
    ReturnType<typeof makeEmptyMetrics>
  >();
  const recentEventsByClient = new Map<string, OidcOpsAuditEvent[]>();
  const countsByClient = normalizeClientCountRows(
    (countsResponse.data ?? []) as ClientCountRow[]
  );
  const bindingsByClient = new Map<string, BindingRow[]>();
  const policyNamesById = new Map<string, string>();

  for (const row of recentAuditRows) {
    if (row.created_at >= since) {
      addAuditMetric(metricsByClient, row);
    }

    if (row.client_id) {
      const events = recentEventsByClient.get(row.client_id) ?? [];
      if (events.length < 10) {
        events.push(mapAuditEvent(row));
      }
      recentEventsByClient.set(row.client_id, events);
    }
  }

  for (const binding of (bindingsResponse.data ?? []) as BindingRow[]) {
    const bindings = bindingsByClient.get(binding.client_id) ?? [];
    bindings.push(binding);
    bindingsByClient.set(binding.client_id, bindings);
  }

  for (const policy of (policiesResponse.data ?? []) as PolicyRow[]) {
    policyNamesById.set(policy.policy_id, policy.policy_name);
  }

  const clients = ((clientsResponse.data ?? []) as ClientOpsRow[]).map(
    (client) => ({
      activeConsentCount:
        countsByClient.get(client.client_id)?.activeConsentCount ?? 0,
      activeTokenCount:
        countsByClient.get(client.client_id)?.activeTokenCount ?? 0,
      allowedScopes: normalizeStringArray(client.allowed_scopes),
      bindings: (bindingsByClient.get(client.client_id) ?? []).map(
        (binding) => ({
          claimName: binding.claim_name,
          enabled: binding.enabled,
          policyId: binding.policy_id,
          policyName: binding.policy_id
            ? policyNamesById.get(binding.policy_id) ?? binding.policy_id
            : null,
        })
      ),
      clientId: client.client_id,
      clientName: client.client_name,
      clientType: client.client_type,
      createdAt: client.created_at,
      defaultScopes: normalizeStringArray(client.default_scopes),
      grantTypes: normalizeStringArray(client.grant_types),
      metrics7d: metricsByClient.get(client.client_id) ?? makeEmptyMetrics(),
      postLogoutRedirectUris: normalizeStringArray(
        client.post_logout_redirect_uris
      ),
      rateLimitTier: client.rate_limit_tier,
      recentAuditEvents: recentEventsByClient.get(client.client_id) ?? [],
      redirectUris: normalizeStringArray(client.redirect_uris),
      status: client.status,
      suspendedAt: client.suspended_at,
      tokenEndpointAuthMethod: client.token_endpoint_auth_method,
      updatedAt: client.updated_at,
      verificationStatus: client.verification_status,
    })
  );

  return {
    clients,
    generatedAt,
    recentAuditEvents: recentAuditEvents.slice(0, 50),
  };
};

export const updateOidcClientOps = async (
  context: AdminRequestContext,
  input: ClientOpsUpdateInput
) => {
  const { supabase } = context;
  const { data: client, error: lookupError } = await supabase
    .from('oidc_clients')
    .select('client_id,status,rate_limit_tier')
    .eq('client_id', input.clientId)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (!client) {
    throw new OidcOpsInputError(`Unknown OIDC client: ${input.clientId}`);
  }

  if (client.status === 'revoked') {
    throw new OidcOpsInputError('Revoked clients cannot be changed in Ops v1');
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    updated_at: now,
  };

  if (input.status) {
    patch.status = input.status;
    patch.suspended_at = input.status === 'suspended' ? now : null;
  }

  if (input.rateLimitTier) {
    patch.rate_limit_tier = input.rateLimitTier;
  }

  const { data: updatedClient, error: updateError } = await supabase
    .from('oidc_clients')
    .update(patch)
    .eq('client_id', input.clientId)
    .select(
      'client_id,client_name,client_type,status,verification_status,token_endpoint_auth_method,redirect_uris,post_logout_redirect_uris,grant_types,default_scopes,allowed_scopes,rate_limit_tier,created_at,updated_at,suspended_at'
    )
    .single();

  if (updateError) {
    throw updateError;
  }

  const { error: auditError } = await supabase.from('oidc_audit_logs').insert({
    log_id: `audit_${randomUUID()}`,
    client_id: input.clientId,
    event_type: 'client.ops_updated',
    actor_type: 'admin',
    actor_identifier: context.email,
    outcome: 'success',
    details: {
      next_rate_limit_tier: input.rateLimitTier ?? client.rate_limit_tier,
      next_status: input.status ?? client.status,
      previous_rate_limit_tier: client.rate_limit_tier,
      previous_status: client.status,
    },
  });

  if (auditError) {
    throw auditError;
  }

  return updatedClient as ClientOpsRow;
};

export const isOidcOpsInputError = (
  error: unknown
): error is OidcOpsInputError => {
  return error instanceof OidcOpsInputError;
};
