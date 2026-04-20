import {
  ALL_OIDC_SCOPES,
  isSupportedScope,
  type ClaimAvailabilityMode,
  type ClaimComputationMethod,
  type ClaimRegistryRecord,
  type ClaimRegistrySource,
  type ClaimRegistryStatus,
  type CubidClaimClassification,
  type IdentityDepthPolicyStatus,
  type IdentityDepthThresholdPolicy,
  type OidcScope,
} from '@cubid/claims';
import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

import type { AdminRequestContext } from './adminApi';

const CLAIM_CLASSIFICATIONS = [
  'identity',
  'hashed',
  'boolean',
  'score',
  'json',
] as const;
const CLAIM_AVAILABILITY_MODES = ['global', 'client_bound'] as const;
const CLAIM_COMPUTATION_METHODS = [
  'seeded',
  'derived_score',
  'derived_verification',
  'derived_stamps',
  'custom_json',
  'custom_boolean',
  'custom_identity',
] as const;
const CLAIM_REGISTRY_SOURCES = ['seed', 'admin'] as const;
const CLAIM_REGISTRY_STATUSES = ['active', 'archived'] as const;
const IDENTITY_POLICY_STATUSES = ['active', 'archived'] as const;
const SCORE_BANDS = ['low', 'medium', 'high', 'very_high'] as const;

type AdminSupabaseClient = SupabaseClient<any, 'public', any>;

interface ClaimRegistryRow {
  archived_at: string | null;
  availability_mode: ClaimAvailabilityMode;
  claim_id: string;
  claim_name: string;
  classification: CubidClaimClassification;
  computation_method: ClaimComputationMethod;
  created_at: string;
  created_by_admin_email: string | null;
  description: string;
  display_name: string;
  metadata: unknown;
  requires_explicit_consent: boolean;
  scopes: unknown;
  source: ClaimRegistrySource;
  status: ClaimRegistryStatus;
  token_eligible: boolean;
  updated_at: string;
  updated_by_admin_email: string | null;
  userinfo_eligible: boolean;
}

interface PolicyRow {
  archived_at: string | null;
  created_at: string;
  created_by_admin_email: string | null;
  description: string;
  metadata: unknown;
  minimum_score_band: string | null;
  policy_id: string;
  policy_name: string;
  policy_version: number;
  required_stamp_keys: unknown;
  required_verification_claims: unknown;
  status: IdentityDepthPolicyStatus;
  target_claims: unknown;
  target_scopes: unknown;
  updated_at: string;
  updated_by_admin_email: string | null;
}

interface BindingRow {
  archived_at: string | null;
  binding_id: string;
  claim_name: string;
  client_id: string;
  created_at: string;
  created_by_admin_email: string | null;
  enabled: boolean;
  metadata: unknown;
  policy_id: string | null;
  updated_at: string;
  updated_by_admin_email: string | null;
}

interface OidcClientRow {
  allowed_scopes: unknown;
  client_id: string;
  client_name: string;
  client_type: string;
  created_at: string;
  default_scopes: unknown;
  status: string;
  updated_at: string;
  verification_status: string;
}

export interface ClientClaimPolicyBindingRecord {
  archivedAt: string | null;
  bindingId: string;
  claimName: string;
  clientId: string;
  createdAt: string;
  enabled: boolean;
  metadata: Readonly<Record<string, unknown>>;
  policyId: string | null;
  updatedAt: string;
}

export interface OidcAdminClientSummary {
  allowedScopes: readonly OidcScope[];
  clientId: string;
  clientName: string;
  clientType: string;
  createdAt: string;
  defaultScopes: readonly OidcScope[];
  status: string;
  updatedAt: string;
  verificationStatus: string;
}

export interface ClaimRegistryUpsertInput {
  availabilityMode: ClaimAvailabilityMode;
  claimId?: string;
  claimName: string;
  classification: CubidClaimClassification;
  computationMethod: ClaimComputationMethod;
  description: string;
  displayName: string;
  metadata?: Readonly<Record<string, unknown>>;
  requiresExplicitConsent: boolean;
  scopes: readonly string[];
  tokenEligible: boolean;
  userinfoEligible: boolean;
}

export interface IdentityDepthPolicyUpsertInput {
  description: string;
  metadata?: Readonly<Record<string, unknown>>;
  minimumScoreBand: string | null;
  name: string;
  policyId?: string;
  requiredStampKeys: readonly string[];
  requiredVerificationClaims: readonly string[];
  targetClaims: readonly string[];
  targetScopes: readonly string[];
}

export interface ClientClaimPolicyBindingUpsertInput {
  bindingId?: string;
  claimName: string;
  clientId: string;
  enabled: boolean;
  metadata?: Readonly<Record<string, unknown>>;
  policyId: string | null;
}

export class AdminInputError extends Error {}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const asMetadataRecord = (value: unknown): Readonly<Record<string, unknown>> => {
  if (!isRecord(value)) {
    return {};
  }

  return value;
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
};

const normalizeString = (value: unknown, label: string) => {
  if (typeof value !== 'string') {
    throw new AdminInputError(`${label} must be a string`);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new AdminInputError(`${label} is required`);
  }

  return normalized;
};

const normalizeOptionalString = (value: unknown) => {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new AdminInputError('Expected a string value');
  }

  const normalized = value.trim();

  return normalized || null;
};

const assertAllowedValue = <T extends string>(
  value: string,
  allowedValues: readonly T[],
  label: string,
): T => {
  if (!allowedValues.includes(value as T)) {
    throw new AdminInputError(`${label} must be one of: ${allowedValues.join(', ')}`);
  }

  return value as T;
};

const normalizeClaimName = (value: unknown) => {
  const claimName = normalizeString(value, 'claimName');

  if (!/^[a-z][a-z0-9_:-]*$/.test(claimName)) {
    throw new AdminInputError(
      'claimName must start with a letter and only include lowercase letters, digits, underscores, colons, or hyphens',
    );
  }

  return claimName;
};

const normalizeStringArray = (value: unknown, label: string) => {
  if (!Array.isArray(value)) {
    throw new AdminInputError(`${label} must be an array of strings`);
  }

  const normalized = value.map((entry) => normalizeString(entry, label));

  return [...new Set(normalized)];
};

const normalizeScopes = (value: unknown, label: string): OidcScope[] => {
  const scopes = normalizeStringArray(value, label);
  const invalidScopes = scopes.filter((scope) => !isSupportedScope(scope));

  if (invalidScopes.length > 0) {
    throw new AdminInputError(`Unsupported scopes: ${invalidScopes.join(', ')}`);
  }

  return scopes as OidcScope[];
};

const normalizeBoolean = (value: unknown, label: string) => {
  if (typeof value !== 'boolean') {
    throw new AdminInputError(`${label} must be a boolean`);
  }

  return value;
};

const mapClaimRegistryRow = (
  row: ClaimRegistryRow,
  boundClientIds: readonly string[],
): ClaimRegistryRecord => {
  return {
    archivedAt: row.archived_at,
    availabilityMode: row.availability_mode,
    boundClientIds,
    claimId: row.claim_id,
    classification: row.classification,
    computationMethod: row.computation_method,
    createdAt: row.created_at,
    description: row.description,
    displayName: row.display_name,
    metadata: asMetadataRecord(row.metadata),
    name: row.claim_name,
    requiresExplicitConsent: row.requires_explicit_consent,
    scopes: normalizeScopes(row.scopes, 'claim scopes'),
    source: row.source,
    status: row.status,
    tokenEligible: row.token_eligible,
    updatedAt: row.updated_at,
    userinfoEligible: row.userinfo_eligible,
  };
};

const mapPolicyRow = (row: PolicyRow): IdentityDepthThresholdPolicy => {
  return {
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    description: row.description,
    metadata: asMetadataRecord(row.metadata),
    minimumScoreBand: row.minimum_score_band,
    name: row.policy_name,
    policyId: row.policy_id,
    policyVersion: row.policy_version,
    requiredStampKeys: asStringArray(row.required_stamp_keys),
    requiredVerificationClaims: asStringArray(row.required_verification_claims),
    status: row.status,
    targetClaims: asStringArray(row.target_claims),
    targetScopes: normalizeScopes(row.target_scopes, 'targetScopes'),
    updatedAt: row.updated_at,
  };
};

const mapBindingRow = (row: BindingRow): ClientClaimPolicyBindingRecord => {
  return {
    archivedAt: row.archived_at,
    bindingId: row.binding_id,
    claimName: row.claim_name,
    clientId: row.client_id,
    createdAt: row.created_at,
    enabled: row.enabled,
    metadata: asMetadataRecord(row.metadata),
    policyId: row.policy_id,
    updatedAt: row.updated_at,
  };
};

const mapOidcClientRow = (row: OidcClientRow): OidcAdminClientSummary => {
  return {
    allowedScopes: normalizeScopes(row.allowed_scopes, 'allowedScopes'),
    clientId: row.client_id,
    clientName: row.client_name,
    clientType: row.client_type,
    createdAt: row.created_at,
    defaultScopes: normalizeScopes(row.default_scopes, 'defaultScopes'),
    status: row.status,
    updatedAt: row.updated_at,
    verificationStatus: row.verification_status,
  };
};

const loadClaimById = async (supabase: AdminSupabaseClient, claimId: string) => {
  const response = await supabase
    .from('oidc_claim_registry')
    .select('*')
    .match({ claim_id: claimId })
    .maybeSingle();

  if (response.error) {
    throw response.error;
  }

  return (response.data as ClaimRegistryRow | null) ?? null;
};

const loadClaimByName = async (supabase: AdminSupabaseClient, claimName: string) => {
  const response = await supabase
    .from('oidc_claim_registry')
    .select('*')
    .match({ claim_name: claimName })
    .maybeSingle();

  if (response.error) {
    throw response.error;
  }

  return (response.data as ClaimRegistryRow | null) ?? null;
};

const loadPolicyById = async (supabase: AdminSupabaseClient, policyId: string) => {
  const response = await supabase
    .from('oidc_identity_depth_policies')
    .select('*')
    .match({ policy_id: policyId })
    .maybeSingle();

  if (response.error) {
    throw response.error;
  }

  return (response.data as PolicyRow | null) ?? null;
};

const loadPolicyByName = async (supabase: AdminSupabaseClient, policyName: string) => {
  const response = await supabase
    .from('oidc_identity_depth_policies')
    .select('*')
    .match({ policy_name: policyName })
    .maybeSingle();

  if (response.error) {
    throw response.error;
  }

  return (response.data as PolicyRow | null) ?? null;
};

const loadBindingById = async (supabase: AdminSupabaseClient, bindingId: string) => {
  const response = await supabase
    .from('oidc_client_claim_policy_bindings')
    .select('*')
    .match({ binding_id: bindingId })
    .maybeSingle();

  if (response.error) {
    throw response.error;
  }

  return (response.data as BindingRow | null) ?? null;
};

const loadActiveBindingByClientAndClaim = async (
  supabase: AdminSupabaseClient,
  clientId: string,
  claimName: string,
) => {
  const response = await supabase
    .from('oidc_client_claim_policy_bindings')
    .select('*')
    .match({ client_id: clientId, claim_name: claimName })
    .is('archived_at', null)
    .maybeSingle();

  if (response.error) {
    throw response.error;
  }

  return (response.data as BindingRow | null) ?? null;
};

const ensureClaimsExist = async (
  supabase: AdminSupabaseClient,
  claimNames: readonly string[],
) => {
  if (claimNames.length === 0) {
    return;
  }

  const response = await supabase
    .from('oidc_claim_registry')
    .select('claim_name')
    .in('claim_name', [...claimNames])
    .is('archived_at', null);

  if (response.error) {
    throw response.error;
  }

  const availableClaims = new Set(
    ((response.data ?? []) as Array<{ claim_name?: string }>).flatMap((row) =>
      typeof row.claim_name === 'string' ? [row.claim_name] : [],
    ),
  );
  const missingClaims = claimNames.filter((claimName) => !availableClaims.has(claimName));

  if (missingClaims.length > 0) {
    throw new AdminInputError(`Unknown or archived claims: ${missingClaims.join(', ')}`);
  }
};

const ensureClientExists = async (supabase: AdminSupabaseClient, clientId: string) => {
  const response = await supabase
    .from('oidc_clients')
    .select('client_id')
    .match({ client_id: clientId })
    .maybeSingle();

  if (response.error) {
    throw response.error;
  }

  if (!response.data) {
    throw new AdminInputError(`Unknown OIDC client: ${clientId}`);
  }
};

const ensurePolicyExists = async (supabase: AdminSupabaseClient, policyId: string) => {
  const policy = await loadPolicyById(supabase, policyId);

  if (!policy || policy.archived_at) {
    throw new AdminInputError(`Unknown or archived policy: ${policyId}`);
  }
};

const nowIsoString = () => new Date().toISOString();

export const OIDC_ADMIN_METADATA = {
  allScopes: [...ALL_OIDC_SCOPES],
  availabilityModes: [...CLAIM_AVAILABILITY_MODES],
  claimClassifications: [...CLAIM_CLASSIFICATIONS],
  claimComputationMethods: [...CLAIM_COMPUTATION_METHODS],
  claimSources: [...CLAIM_REGISTRY_SOURCES],
  claimStatuses: [...CLAIM_REGISTRY_STATUSES],
  identityPolicyStatuses: [...IDENTITY_POLICY_STATUSES],
  supportedMinimumScoreBands: [...SCORE_BANDS],
} as const;

export const listOidcClients = async (
  supabase: AdminSupabaseClient,
): Promise<OidcAdminClientSummary[]> => {
  const response = await supabase
    .from('oidc_clients')
    .select(
      'client_id, client_name, client_type, status, verification_status, default_scopes, allowed_scopes, created_at, updated_at',
    )
    .order('client_name', { ascending: true });

  if (response.error) {
    throw response.error;
  }

  return ((response.data ?? []) as OidcClientRow[]).map(mapOidcClientRow);
};

export const listClaimRegistry = async (
  supabase: AdminSupabaseClient,
  options: { includeArchived?: boolean } = {},
): Promise<ClaimRegistryRecord[]> => {
  let claimsQuery = supabase
    .from('oidc_claim_registry')
    .select('*')
    .order('claim_name', { ascending: true });

  if (!options.includeArchived) {
    claimsQuery = claimsQuery.is('archived_at', null);
  }

  const [claimsResponse, bindingsResponse] = await Promise.all([
    claimsQuery,
    supabase
      .from('oidc_client_claim_policy_bindings')
      .select('client_id, claim_name')
      .is('archived_at', null),
  ]);

  if (claimsResponse.error) {
    throw claimsResponse.error;
  }

  if (bindingsResponse.error) {
    throw bindingsResponse.error;
  }

  const boundClientIdsByClaim = new Map<string, string[]>();

  for (const binding of (bindingsResponse.data ?? []) as Array<{
    claim_name?: string;
    client_id?: string;
  }>) {
    if (typeof binding.claim_name !== 'string' || typeof binding.client_id !== 'string') {
      continue;
    }

    const boundClientIds = boundClientIdsByClaim.get(binding.claim_name) ?? [];
    boundClientIds.push(binding.client_id);
    boundClientIdsByClaim.set(binding.claim_name, boundClientIds);
  }

  return ((claimsResponse.data ?? []) as ClaimRegistryRow[]).map((row) =>
    mapClaimRegistryRow(row, boundClientIdsByClaim.get(row.claim_name) ?? []),
  );
};

export const upsertClaimRegistryRecord = async (
  context: AdminRequestContext,
  input: ClaimRegistryUpsertInput,
): Promise<ClaimRegistryRecord> => {
  const claimName = normalizeClaimName(input.claimName);
  const claimId = input.claimId ? normalizeString(input.claimId, 'claimId') : null;
  const displayName = normalizeString(input.displayName, 'displayName');
  const description = normalizeString(input.description, 'description');
  const scopes = normalizeScopes(input.scopes, 'scopes');
  const classification = assertAllowedValue(
    input.classification,
    CLAIM_CLASSIFICATIONS,
    'classification',
  );
  const availabilityMode = assertAllowedValue(
    input.availabilityMode,
    CLAIM_AVAILABILITY_MODES,
    'availabilityMode',
  );
  const computationMethod = assertAllowedValue(
    input.computationMethod,
    CLAIM_COMPUTATION_METHODS,
    'computationMethod',
  );
  const tokenEligible = normalizeBoolean(input.tokenEligible, 'tokenEligible');
  const userinfoEligible = normalizeBoolean(input.userinfoEligible, 'userinfoEligible');
  const requiresExplicitConsent = normalizeBoolean(
    input.requiresExplicitConsent,
    'requiresExplicitConsent',
  );
  const metadata = asMetadataRecord(input.metadata);

  const existingClaim = claimId
    ? await loadClaimById(context.supabase, claimId)
    : await loadClaimByName(context.supabase, claimName);

  if (existingClaim && existingClaim.source === 'seed') {
    throw new AdminInputError('Seeded issuer claims are read-only in the admin registry');
  }

  if (existingClaim && existingClaim.claim_name !== claimName) {
    throw new AdminInputError('claimName is immutable after creation');
  }

  if (!existingClaim) {
    const duplicateClaim = await loadClaimByName(context.supabase, claimName);

    if (duplicateClaim) {
      throw new AdminInputError(`A claim named ${claimName} already exists`);
    }
  }

  const payload = {
    archived_at: null,
    availability_mode: availabilityMode,
    claim_name: claimName,
    classification,
    computation_method: computationMethod,
    description,
    display_name: displayName,
    metadata,
    requires_explicit_consent: requiresExplicitConsent,
    scopes,
    source: 'admin' as const,
    status: 'active' as const,
    token_eligible: tokenEligible,
    updated_at: nowIsoString(),
    updated_by_admin_email: context.email,
    userinfo_eligible: userinfoEligible,
  };

  if (existingClaim) {
    const response = await context.supabase
      .from('oidc_claim_registry')
      .update(payload)
      .match({ claim_id: existingClaim.claim_id })
      .select('*')
      .maybeSingle();

    if (response.error || !response.data) {
      throw response.error ?? new Error('Failed to update claim registry record');
    }

    return mapClaimRegistryRow(response.data as ClaimRegistryRow, []);
  }

  const response = await context.supabase
    .from('oidc_claim_registry')
    .insert({
      ...payload,
      claim_id: claimId ?? `claim:${randomUUID()}`,
      created_by_admin_email: context.email,
      created_at: nowIsoString(),
    })
    .select('*')
    .maybeSingle();

  if (response.error || !response.data) {
    throw response.error ?? new Error('Failed to create claim registry record');
  }

  return mapClaimRegistryRow(response.data as ClaimRegistryRow, []);
};

export const archiveClaimRegistryRecord = async (
  context: AdminRequestContext,
  claimId: string,
): Promise<ClaimRegistryRecord> => {
  const existingClaim = await loadClaimById(context.supabase, normalizeString(claimId, 'claimId'));

  if (!existingClaim) {
    throw new AdminInputError('Claim not found');
  }

  if (existingClaim.source === 'seed') {
    throw new AdminInputError('Seeded issuer claims cannot be archived');
  }

  const archivedAt = nowIsoString();
  const response = await context.supabase
    .from('oidc_claim_registry')
    .update({
      archived_at: archivedAt,
      status: 'archived',
      updated_at: archivedAt,
      updated_by_admin_email: context.email,
    })
    .match({ claim_id: existingClaim.claim_id })
    .select('*')
    .maybeSingle();

  if (response.error || !response.data) {
    throw response.error ?? new Error('Failed to archive claim registry record');
  }

  const bindingArchiveResponse = await context.supabase
    .from('oidc_client_claim_policy_bindings')
    .update({
      archived_at: archivedAt,
      updated_at: archivedAt,
      updated_by_admin_email: context.email,
    })
    .match({ claim_name: existingClaim.claim_name })
    .is('archived_at', null);

  if (bindingArchiveResponse.error) {
    throw bindingArchiveResponse.error;
  }

  return mapClaimRegistryRow(response.data as ClaimRegistryRow, []);
};

export const listIdentityDepthPolicies = async (
  supabase: AdminSupabaseClient,
  options: { includeArchived?: boolean } = {},
): Promise<IdentityDepthThresholdPolicy[]> => {
  let query = supabase
    .from('oidc_identity_depth_policies')
    .select('*')
    .order('updated_at', { ascending: false });

  if (!options.includeArchived) {
    query = query.is('archived_at', null);
  }

  const response = await query;

  if (response.error) {
    throw response.error;
  }

  return ((response.data ?? []) as PolicyRow[]).map(mapPolicyRow);
};

export const upsertIdentityDepthPolicy = async (
  context: AdminRequestContext,
  input: IdentityDepthPolicyUpsertInput,
): Promise<IdentityDepthThresholdPolicy> => {
  const policyId = input.policyId ? normalizeString(input.policyId, 'policyId') : null;
  const policyName = normalizeString(input.name, 'name');
  const description = normalizeString(input.description, 'description');
  const targetClaims = normalizeStringArray(input.targetClaims, 'targetClaims');
  const targetScopes = normalizeScopes(input.targetScopes, 'targetScopes');
  const requiredVerificationClaims = normalizeStringArray(
    input.requiredVerificationClaims,
    'requiredVerificationClaims',
  );
  const requiredStampKeys = normalizeStringArray(input.requiredStampKeys, 'requiredStampKeys');
  const minimumScoreBand = normalizeOptionalString(input.minimumScoreBand);
  const metadata = asMetadataRecord(input.metadata);

  if (minimumScoreBand) {
    assertAllowedValue(minimumScoreBand, SCORE_BANDS, 'minimumScoreBand');
  }

  await ensureClaimsExist(context.supabase, [
    ...targetClaims,
    ...requiredVerificationClaims,
  ]);

  const existingPolicy = policyId
    ? await loadPolicyById(context.supabase, policyId)
    : await loadPolicyByName(context.supabase, policyName);

  if (!existingPolicy) {
    const duplicatePolicy = await loadPolicyByName(context.supabase, policyName);

    if (duplicatePolicy) {
      throw new AdminInputError(`A policy named ${policyName} already exists`);
    }
  }

  const payload = {
    archived_at: null,
    description,
    metadata,
    minimum_score_band: minimumScoreBand,
    policy_name: policyName,
    required_stamp_keys: requiredStampKeys,
    required_verification_claims: requiredVerificationClaims,
    status: 'active' as const,
    target_claims: targetClaims,
    target_scopes: targetScopes,
    updated_at: nowIsoString(),
    updated_by_admin_email: context.email,
  };

  if (existingPolicy) {
    const response = await context.supabase
      .from('oidc_identity_depth_policies')
      .update({
        ...payload,
        policy_version: existingPolicy.policy_version + 1,
      })
      .match({ policy_id: existingPolicy.policy_id })
      .select('*')
      .maybeSingle();

    if (response.error || !response.data) {
      throw response.error ?? new Error('Failed to update identity depth policy');
    }

    return mapPolicyRow(response.data as PolicyRow);
  }

  const response = await context.supabase
    .from('oidc_identity_depth_policies')
    .insert({
      ...payload,
      created_at: nowIsoString(),
      created_by_admin_email: context.email,
      policy_id: policyId ?? `policy:${randomUUID()}`,
      policy_version: 1,
    })
    .select('*')
    .maybeSingle();

  if (response.error || !response.data) {
    throw response.error ?? new Error('Failed to create identity depth policy');
  }

  return mapPolicyRow(response.data as PolicyRow);
};

export const archiveIdentityDepthPolicy = async (
  context: AdminRequestContext,
  policyId: string,
): Promise<IdentityDepthThresholdPolicy> => {
  const existingPolicy = await loadPolicyById(
    context.supabase,
    normalizeString(policyId, 'policyId'),
  );

  if (!existingPolicy) {
    throw new AdminInputError('Policy not found');
  }

  const archivedAt = nowIsoString();
  const response = await context.supabase
    .from('oidc_identity_depth_policies')
    .update({
      archived_at: archivedAt,
      status: 'archived',
      updated_at: archivedAt,
      updated_by_admin_email: context.email,
    })
    .match({ policy_id: existingPolicy.policy_id })
    .select('*')
    .maybeSingle();

  if (response.error || !response.data) {
    throw response.error ?? new Error('Failed to archive identity depth policy');
  }

  const bindingArchiveResponse = await context.supabase
    .from('oidc_client_claim_policy_bindings')
    .update({
      archived_at: archivedAt,
      updated_at: archivedAt,
      updated_by_admin_email: context.email,
    })
    .match({ policy_id: existingPolicy.policy_id })
    .is('archived_at', null);

  if (bindingArchiveResponse.error) {
    throw bindingArchiveResponse.error;
  }

  return mapPolicyRow(response.data as PolicyRow);
};

export const listClientClaimPolicyBindings = async (
  supabase: AdminSupabaseClient,
  options: { includeArchived?: boolean } = {},
): Promise<ClientClaimPolicyBindingRecord[]> => {
  let query = supabase
    .from('oidc_client_claim_policy_bindings')
    .select('*')
    .order('updated_at', { ascending: false });

  if (!options.includeArchived) {
    query = query.is('archived_at', null);
  }

  const response = await query;

  if (response.error) {
    throw response.error;
  }

  return ((response.data ?? []) as BindingRow[]).map(mapBindingRow);
};

export const upsertClientClaimPolicyBinding = async (
  context: AdminRequestContext,
  input: ClientClaimPolicyBindingUpsertInput,
): Promise<ClientClaimPolicyBindingRecord> => {
  const bindingId = input.bindingId ? normalizeString(input.bindingId, 'bindingId') : null;
  const clientId = normalizeString(input.clientId, 'clientId');
  const claimName = normalizeClaimName(input.claimName);
  const enabled = normalizeBoolean(input.enabled, 'enabled');
  const metadata = asMetadataRecord(input.metadata);
  const policyId = normalizeOptionalString(input.policyId);

  await Promise.all([
    ensureClientExists(context.supabase, clientId),
    ensureClaimsExist(context.supabase, [claimName]),
    policyId ? ensurePolicyExists(context.supabase, policyId) : Promise.resolve(),
  ]);

  const existingBinding = bindingId
    ? await loadBindingById(context.supabase, bindingId)
    : await loadActiveBindingByClientAndClaim(context.supabase, clientId, claimName);

  if (existingBinding) {
    if (existingBinding.client_id !== clientId || existingBinding.claim_name !== claimName) {
      throw new AdminInputError('clientId and claimName are immutable after a binding is created');
    }

    const response = await context.supabase
      .from('oidc_client_claim_policy_bindings')
      .update({
        archived_at: null,
        enabled,
        metadata,
        policy_id: policyId,
        updated_at: nowIsoString(),
        updated_by_admin_email: context.email,
      })
      .match({ binding_id: existingBinding.binding_id })
      .select('*')
      .maybeSingle();

    if (response.error || !response.data) {
      throw response.error ?? new Error('Failed to update client claim policy binding');
    }

    return mapBindingRow(response.data as BindingRow);
  }

  const response = await context.supabase
    .from('oidc_client_claim_policy_bindings')
    .insert({
      archived_at: null,
      binding_id: bindingId ?? `binding:${randomUUID()}`,
      claim_name: claimName,
      client_id: clientId,
      created_at: nowIsoString(),
      created_by_admin_email: context.email,
      enabled,
      metadata,
      policy_id: policyId,
      updated_at: nowIsoString(),
      updated_by_admin_email: context.email,
    })
    .select('*')
    .maybeSingle();

  if (response.error || !response.data) {
    throw response.error ?? new Error('Failed to create client claim policy binding');
  }

  return mapBindingRow(response.data as BindingRow);
};

export const archiveClientClaimPolicyBinding = async (
  context: AdminRequestContext,
  bindingId: string,
): Promise<ClientClaimPolicyBindingRecord> => {
  const existingBinding = await loadBindingById(
    context.supabase,
    normalizeString(bindingId, 'bindingId'),
  );

  if (!existingBinding) {
    throw new AdminInputError('Binding not found');
  }

  const archivedAt = nowIsoString();
  const response = await context.supabase
    .from('oidc_client_claim_policy_bindings')
    .update({
      archived_at: archivedAt,
      updated_at: archivedAt,
      updated_by_admin_email: context.email,
    })
    .match({ binding_id: existingBinding.binding_id })
    .select('*')
    .maybeSingle();

  if (response.error || !response.data) {
    throw response.error ?? new Error('Failed to archive client claim policy binding');
  }

  return mapBindingRow(response.data as BindingRow);
};