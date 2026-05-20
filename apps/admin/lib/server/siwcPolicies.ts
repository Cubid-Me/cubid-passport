import { randomUUID } from 'crypto';

import type { AdminRequestContext } from './adminApi';

const ALLOWED_CHAINS = ['evm', 'near', 'solana', 'sui'] as const;
const ALLOWED_REQUEST_TYPES = ['message', 'typed_data', 'transaction'] as const;
const POLICY_STATUSES = ['disabled', 'enabled', 'suspended'] as const;
const PASSKEY_ACR = 'urn:cubid:acr:passkey' as const;

type SiwcAllowedChain = (typeof ALLOWED_CHAINS)[number];
type SiwcAllowedRequestType = (typeof ALLOWED_REQUEST_TYPES)[number];
type SiwcPolicyStatus = (typeof POLICY_STATUSES)[number];

interface DappRow {
  appname: string | null;
  id: number | string;
  uid: string | null;
}

interface SiwcPolicyRow {
  allowed_chains: unknown;
  allowed_request_types: unknown;
  contract_allowlist: unknown;
  created_at: string;
  custody_enabled: boolean;
  dapp_id: number | string;
  id: string;
  metadata: unknown;
  policy_name: string;
  policy_version: number;
  required_acr: string | null;
  sandbox_mode: boolean;
  signing_enabled: boolean;
  status: SiwcPolicyStatus;
  transaction_value_limit_usd: number | string | null;
  updated_at: string;
  webhook_event_subscriptions: unknown;
}

export interface SiwcPolicy {
  allowedChains: SiwcAllowedChain[];
  allowedRequestTypes: SiwcAllowedRequestType[];
  contractAllowlist: string[];
  createdAt: string | null;
  custodyEnabled: boolean;
  dappId: number;
  dappName: string;
  dappUid: string | null;
  metadata: Record<string, unknown>;
  policyId: string | null;
  policyName: string;
  policyVersion: number;
  requiredAcr: typeof PASSKEY_ACR | null;
  sandboxMode: boolean;
  signingEnabled: boolean;
  status: SiwcPolicyStatus;
  transactionValueLimitUsd: number | null;
  updatedAt: string | null;
  webhookEventSubscriptions: string[];
}

export interface SiwcPolicyUpsertInput {
  allowedChains: SiwcAllowedChain[];
  allowedRequestTypes: SiwcAllowedRequestType[];
  contractAllowlist?: string[];
  custodyEnabled: boolean;
  dappId: number;
  metadata?: Record<string, unknown>;
  policyName: string;
  requiredAcr?: typeof PASSKEY_ACR | null;
  sandboxMode: boolean;
  signingEnabled: boolean;
  status: SiwcPolicyStatus;
  transactionValueLimitUsd?: number | null;
  webhookEventSubscriptions?: string[];
}

export interface SiwcPolicyList {
  generatedAt: string;
  policies: SiwcPolicy[];
}

class SiwcPolicyInputError extends Error {}

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
};

const normalizeMetadata = (value: unknown): Record<string, unknown> => {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
};

const normalizeNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const uniqueStrings = (values: string[]) => Array.from(new Set(values));

const ensureAllowedValues = <T extends string>(
  values: string[],
  allowed: readonly T[],
  fieldName: string
): T[] => {
  const normalized = uniqueStrings(values.map((value) => value.trim()).filter(Boolean));
  const invalid = normalized.filter((value) => !allowed.includes(value as T));

  if (invalid.length > 0) {
    throw new SiwcPolicyInputError(
      `${fieldName} contains unsupported values: ${invalid.join(', ')}`
    );
  }

  return normalized as T[];
};

const mapPolicy = (dapp: DappRow, policy?: SiwcPolicyRow | null): SiwcPolicy => {
  const dappId = Number(dapp.id);

  return {
    allowedChains: ensureAllowedValues(
      normalizeStringArray(policy?.allowed_chains),
      ALLOWED_CHAINS,
      'allowedChains'
    ),
    allowedRequestTypes: ensureAllowedValues(
      normalizeStringArray(policy?.allowed_request_types),
      ALLOWED_REQUEST_TYPES,
      'allowedRequestTypes'
    ),
    contractAllowlist: uniqueStrings(normalizeStringArray(policy?.contract_allowlist)),
    createdAt: policy?.created_at ?? null,
    custodyEnabled: policy?.custody_enabled ?? false,
    dappId,
    dappName: dapp.appname ?? `Dapp ${dappId}`,
    dappUid: dapp.uid ?? null,
    metadata: normalizeMetadata(policy?.metadata),
    policyId: policy?.id ?? null,
    policyName: policy?.policy_name ?? 'Default SIWC policy',
    policyVersion: policy?.policy_version ?? 0,
    requiredAcr:
      policy?.required_acr === PASSKEY_ACR ? PASSKEY_ACR : null,
    sandboxMode: policy?.sandbox_mode ?? true,
    signingEnabled: policy?.signing_enabled ?? false,
    status: policy?.status ?? 'disabled',
    transactionValueLimitUsd: normalizeNumber(policy?.transaction_value_limit_usd),
    updatedAt: policy?.updated_at ?? null,
    webhookEventSubscriptions: uniqueStrings(
      normalizeStringArray(policy?.webhook_event_subscriptions)
    ),
  };
};

export const normalizeSiwcPolicyInput = (
  input: SiwcPolicyUpsertInput
): SiwcPolicyUpsertInput => {
  const allowedChains = ensureAllowedValues(
    input.allowedChains,
    ALLOWED_CHAINS,
    'allowedChains'
  );
  const allowedRequestTypes = ensureAllowedValues(
    input.allowedRequestTypes,
    ALLOWED_REQUEST_TYPES,
    'allowedRequestTypes'
  );
  const status = input.status;

  if (!POLICY_STATUSES.includes(status)) {
    throw new SiwcPolicyInputError('status must be disabled, enabled, or suspended');
  }

  if (input.custodyEnabled || input.signingEnabled) {
    throw new SiwcPolicyInputError(
      'Legacy Cubid wallet custody and signing controls are deprecated. Use recoverable-wallet recovery bundles instead.'
    );
  }

  if (input.signingEnabled && input.requiredAcr !== PASSKEY_ACR) {
    throw new SiwcPolicyInputError('Signing policies must require passkey ACR');
  }

  if (status === 'enabled' && input.signingEnabled && allowedRequestTypes.length === 0) {
    throw new SiwcPolicyInputError('Signing policies must allow at least one request type');
  }

  if ((input.custodyEnabled || input.signingEnabled) && allowedChains.length === 0) {
    throw new SiwcPolicyInputError('Custody or signing policies must allow at least one chain');
  }

  return {
    ...input,
    allowedChains,
    allowedRequestTypes,
    contractAllowlist: uniqueStrings(input.contractAllowlist ?? []),
    metadata: input.metadata ?? {},
    requiredAcr: input.signingEnabled ? PASSKEY_ACR : input.requiredAcr ?? null,
    transactionValueLimitUsd: input.transactionValueLimitUsd ?? null,
    webhookEventSubscriptions: uniqueStrings(input.webhookEventSubscriptions ?? []),
  };
};

const logPolicyEvent = async (
  context: AdminRequestContext,
  eventType: string,
  policy: SiwcPolicy
) => {
  const { error } = await context.supabase.from('api_security_events').insert({
    actor_identifier: context.adminUser.uid,
    actor_type: 'admin',
    details: {
      dapp_id: policy.dappId,
      policy_version: policy.policyVersion,
      status: policy.status,
    },
    event_id: `api_event_${randomUUID().replace(/-/g, '')}`,
    event_type: eventType,
    outcome: 'success',
    request_id: context.requestId,
    route: 'admin/siwc/policies/upsert',
  });

  if (error) {
    throw error;
  }
};

export const listSiwcPolicies = async (
  context: AdminRequestContext
): Promise<SiwcPolicyList> => {
  const dappsResponse = await context.supabase
    .from('dapps')
    .select('id,uid,appname')
    .match({ admin_uid: context.adminUser.uid })
    .order('id', { ascending: true });

  if (dappsResponse.error) {
    throw dappsResponse.error;
  }

  const dapps = (dappsResponse.data ?? []) as DappRow[];
  const dappIds = dapps.map((dapp) => Number(dapp.id)).filter(Number.isFinite);

  if (dappIds.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      policies: [],
    };
  }

  const policiesResponse = await context.supabase
    .from('siwc_signing_policies')
    .select('*')
    .in('dapp_id', dappIds);

  if (policiesResponse.error) {
    throw policiesResponse.error;
  }

  const policiesByDappId = new Map<number, SiwcPolicyRow>();
  for (const policy of (policiesResponse.data ?? []) as SiwcPolicyRow[]) {
    policiesByDappId.set(Number(policy.dapp_id), policy);
  }

  return {
    generatedAt: new Date().toISOString(),
    policies: dapps.map((dapp) =>
      mapPolicy(dapp, policiesByDappId.get(Number(dapp.id)) ?? null)
    ),
  };
};

export const upsertSiwcPolicy = async (
  context: AdminRequestContext,
  input: SiwcPolicyUpsertInput
): Promise<SiwcPolicy> => {
  const normalized = normalizeSiwcPolicyInput(input);
  const dappResponse = await context.supabase
    .from('dapps')
    .select('id,uid,appname')
    .match({
      admin_uid: context.adminUser.uid,
      id: normalized.dappId,
    })
    .maybeSingle();

  if (dappResponse.error) {
    throw dappResponse.error;
  }

  if (!dappResponse.data) {
    throw new SiwcPolicyInputError('Dapp was not found for this admin user');
  }

  const existingResponse = await context.supabase
    .from('siwc_signing_policies')
    .select('*')
    .match({ dapp_id: normalized.dappId })
    .maybeSingle();

  if (existingResponse.error) {
    throw existingResponse.error;
  }

  const existing = existingResponse.data as SiwcPolicyRow | null;
  const payload = {
    allowed_chains: normalized.allowedChains,
    allowed_request_types: normalized.allowedRequestTypes,
    contract_allowlist: normalized.contractAllowlist,
    custody_enabled: normalized.custodyEnabled,
    dapp_id: normalized.dappId,
    metadata: normalized.metadata,
    policy_name: normalized.policyName,
    policy_version: (existing?.policy_version ?? 0) + 1,
    required_acr: normalized.requiredAcr,
    sandbox_mode: normalized.sandboxMode,
    signing_enabled: normalized.signingEnabled,
    status: normalized.status,
    transaction_value_limit_usd: normalized.transactionValueLimitUsd,
    updated_at: new Date().toISOString(),
    webhook_event_subscriptions: normalized.webhookEventSubscriptions,
  };

  const write = existing
    ? context.supabase
        .from('siwc_signing_policies')
        .update(payload)
        .match({ dapp_id: normalized.dappId })
    : context.supabase.from('siwc_signing_policies').insert(payload);

  const writeResponse = await write.select('*').maybeSingle();

  if (writeResponse.error) {
    throw writeResponse.error;
  }

  const policy = mapPolicy(
    dappResponse.data as DappRow,
    writeResponse.data as SiwcPolicyRow
  );
  const eventType =
    policy.status === 'suspended'
      ? 'siwc_policy.suspended'
      : existing
        ? 'siwc_policy.updated'
        : 'siwc_policy.created';

  await logPolicyEvent(context, eventType, policy);

  return policy;
};

export const isSiwcPolicyInputError = (
  error: unknown
): error is SiwcPolicyInputError =>
  error instanceof SiwcPolicyInputError;
