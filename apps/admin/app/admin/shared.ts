import type {
  ClaimAvailabilityMode,
  ClaimComputationMethod,
  ClaimRegistryRecord,
  CubidClaimClassification,
  IdentityDepthPolicyStatus,
  IdentityDepthThresholdPolicy,
  OidcScope,
} from '@cubid/claims';

export interface SchemaRecord {
  description: string;
  id: number;
}

export interface StampTypeRecord {
  id: number;
  stamptype: string;
}

export interface DappRecord {
  admin_uid: string;
  apikey: string;
  appname: string;
  id: number;
  uid: string;
}

export interface MetadataPayload {
  schemas: SchemaRecord[];
  stampTypes: StampTypeRecord[];
  webhookTypes?: Array<{
    id: number;
    name: string;
  }>;
}

export interface PageConfigRecord {
  id: number;
  page_id: number;
  stamptype_id: number;
  include_in_score: boolean;
  is_auth_enabled: boolean;
  is_infosharing_required: boolean;
  info_sharing_type_id: number;
}

export type InfoSharingValue = 'hashed' | 'identity' | 'json' | 'not';

export interface InfoSharingOption {
  id: number;
  label: string;
  value: InfoSharingValue;
}

export interface RequestedInfoItem {
  auth: boolean;
  required: boolean;
  score: boolean;
  selectedOption: InfoSharingValue;
}

export interface OidcAdminClientSummary {
  allowedScopes: OidcScope[];
  clientId: string;
  clientName: string;
  clientType: string;
  createdAt: string;
  defaultScopes: OidcScope[];
  status: string;
  updatedAt: string;
  verificationStatus: string;
}

export interface OidcClientClaimPolicyBindingRecord {
  archivedAt: string | null;
  bindingId: string;
  claimName: string;
  clientId: string;
  createdAt: string;
  enabled: boolean;
  metadata: Record<string, unknown>;
  policyId: string | null;
  updatedAt: string;
}

export interface OidcAdminRegistryMetadata {
  allScopes: OidcScope[];
  availabilityModes: ClaimAvailabilityMode[];
  claimClassifications: CubidClaimClassification[];
  claimComputationMethods: ClaimComputationMethod[];
  claimSources: Array<'seed' | 'admin'>;
  claimStatuses: Array<'active' | 'archived'>;
  identityPolicyStatuses: IdentityDepthPolicyStatus[];
  supportedMinimumScoreBands: string[];
}

export interface OidcAdminMetadataPayload {
  claims: ClaimRegistryRecord[];
  clients: OidcAdminClientSummary[];
  metadata: OidcAdminRegistryMetadata;
  policies: IdentityDepthThresholdPolicy[];
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
  rateLimitTier: 'starter' | 'trusted' | 'internal';
  recentAuditEvents: OidcOpsAuditEvent[];
  redirectUris: string[];
  status: string;
  suspendedAt: string | null;
  tokenEndpointAuthMethod: string;
  updatedAt: string;
  verificationStatus: string;
}

export interface OidcPasskeyOpsSummary {
  activeCount: number;
  authenticationFailures7d: number;
  authenticationSuccesses7d: number;
  recentAuditEvents: OidcOpsAuditEvent[];
  registrations7d: number;
  revocations7d: number;
  revokedCount: number;
  stepUpFailures7d: number;
  supportedAcrValues: string[];
}

export interface OidcOpsOverviewPayload {
  clients: OidcOpsClientSummary[];
  generatedAt: string;
  passkeys: OidcPasskeyOpsSummary;
  recentAuditEvents: OidcOpsAuditEvent[];
}

export type RequestedInfoMap = Record<string, RequestedInfoItem>;
export type RequestedInfoByIndex = Record<number, RequestedInfoMap>;

export interface PageFormValues {
  app_name: string;
  redirect_url: string;
}

export const INFO_SHARING_OPTIONS: InfoSharingOption[] = [
  { value: 'json', label: 'Full JSON', id: 4 },
  { value: 'identity', label: 'Identity', id: 3 },
  { value: 'hashed', label: 'Hashed Value', id: 2 },
  { value: 'not', label: 'Not Included', id: 1 },
];

export const buildRequestedInfo = (stampNames: string[]): RequestedInfoMap => {
  const stateObject: RequestedInfoMap = {};

  stampNames.forEach((stampName) => {
    stateObject[stampName] = {
      auth: false,
      required: false,
      score: false,
      selectedOption: 'not',
    };
  });

  return stateObject;
};

export const getInfoSharingTypeId = (selectedOption: InfoSharingValue) => {
  return (
    INFO_SHARING_OPTIONS.find((option) => option.value === selectedOption)
      ?.id ?? 1
  );
};

export const getInfoSharingValue = (
  infoSharingTypeId?: number | null
): InfoSharingValue => {
  return (
    INFO_SHARING_OPTIONS.find((option) => option.id === infoSharingTypeId)
      ?.value ?? 'not'
  );
};
