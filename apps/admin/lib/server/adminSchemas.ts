import { z } from '@cubid/auth/server';

const stampConfigSchema = z
  .object({
    auth: z.boolean().optional(),
    infoSharingTypeId: z.coerce.number().int().positive(),
    required: z.boolean().optional(),
    score: z.boolean().optional(),
    stampTypeId: z.coerce.number().int().positive(),
  })
  .passthrough();

const pageCreateSchema = z
  .object({
    pageName: z.string().trim().min(1),
    redirectUrl: z.string().trim().min(1),
    stampConfigs: z.array(stampConfigSchema).optional(),
  })
  .passthrough();

const pageUpdateSchema = pageCreateSchema
  .extend({
    pageId: z.coerce.number().int().positive(),
  })
  .passthrough();

export const adminNoBodySchema = z.object({}).passthrough();

export const adminIncludeArchivedSchema = z
  .object({
    includeArchived: z.boolean().optional(),
  })
  .passthrough();

export const adminDappIdSchema = z
  .object({
    dappId: z.coerce.number().int().positive(),
  })
  .passthrough();

export const adminPageIdSchema = z
  .object({
    pageId: z.coerce.number().int().positive(),
  })
  .passthrough();

export const adminAppsCreateSchema = z
  .object({
    appName: z.string().trim().min(1),
    pages: z.array(pageCreateSchema).min(1),
    schemaId: z.coerce.number().int().positive(),
    url: z.string().trim().min(1).optional(),
  })
  .passthrough();

export const adminAppsUpdateSchema = z
  .object({
    appName: z.string().trim().min(1),
    dappId: z.coerce.number().int().positive(),
    redirectUrl: z.string().trim().min(1).optional(),
    schemaId: z.coerce.number().int().positive(),
    stampConfigs: z.array(stampConfigSchema).optional(),
    url: z.string().trim().min(1).optional(),
  })
  .passthrough();

export const adminPagesCreateSchema = z
  .object({
    dappId: z.coerce.number().int().positive(),
    pages: z.array(pageCreateSchema).min(1),
  })
  .passthrough();

export const adminPagesUpdateSchema = z
  .object({
    dappId: z.coerce.number().int().positive(),
    pages: z.array(pageUpdateSchema).min(1),
  })
  .passthrough();

export const adminWebhookCreateSchema = z
  .object({
    dappId: z.coerce.number().int().positive(),
    webhookTypeId: z.coerce.number().int().positive(),
    webhookUrl: z.string().trim().min(1),
  })
  .passthrough();

export const adminWebhookDetailsSchema = z
  .object({
    dappId: z.coerce.number().int().positive(),
    eventType: z.string().trim().min(1),
  })
  .passthrough();

export const adminWebhookRotateSecretSchema = z
  .object({
    webhookId: z.coerce.number().int().positive(),
  })
  .passthrough();

export const adminArchiveClaimSchema = z
  .object({
    claimId: z.string().trim().min(1),
  })
  .passthrough();

export const adminArchivePolicySchema = z
  .object({
    policyId: z.string().trim().min(1),
  })
  .passthrough();

export const adminArchiveBindingSchema = z
  .object({
    bindingId: z.string().trim().min(1),
  })
  .passthrough();

export const adminOidcClaimUpsertSchema = z
  .object({
    availabilityMode: z.string().optional(),
    claimId: z.string().trim().min(1).optional(),
    claimName: z.string().trim().min(1),
    classification: z.string().trim().min(1),
    computationMethod: z.string().trim().min(1),
    description: z.string().trim().min(1),
    displayName: z.string().trim().min(1),
    metadata: z.record(z.unknown()).optional(),
    requiresExplicitConsent: z.boolean(),
    scopes: z.array(z.string()),
    tokenEligible: z.boolean(),
    userinfoEligible: z.boolean(),
  })
  .passthrough();

export const adminOidcPolicyUpsertSchema = z
  .object({
    description: z.string().trim().min(1),
    metadata: z.record(z.unknown()).optional(),
    minimumScoreBand: z.string().trim().min(1).nullable().optional(),
    name: z.string().trim().min(1),
    policyId: z.string().trim().min(1).optional(),
    requiredStampKeys: z.array(z.string()),
    requiredVerificationClaims: z.array(z.string()),
    targetClaims: z.array(z.string()),
    targetScopes: z.array(z.string()),
  })
  .passthrough();

export const adminOidcBindingUpsertSchema = z
  .object({
    bindingId: z.string().trim().min(1).optional(),
    claimName: z.string().trim().min(1),
    clientId: z.string().trim().min(1),
    enabled: z.boolean(),
    metadata: z.record(z.unknown()).optional(),
    policyId: z.string().trim().min(1).nullable(),
  })
  .passthrough();

export const adminOidcClientOpsUpdateSchema = z
  .object({
    clientId: z.string().trim().min(1),
    rateLimitTier: z.enum(['starter', 'trusted', 'internal']).optional(),
    status: z.enum(['active', 'suspended']).optional(),
  })
  .passthrough();

export const adminSiwcPolicyListSchema = z.object({}).passthrough();

export const adminSiwcPolicyUpsertSchema = z
  .object({
    allowedChains: z.array(z.enum(['evm', 'near', 'solana', 'sui'])),
    allowedRequestTypes: z.array(z.enum(['message', 'typed_data', 'transaction'])),
    contractAllowlist: z.array(z.string().trim().min(1)).optional(),
    custodyEnabled: z.boolean(),
    dappId: z.coerce.number().int().positive(),
    metadata: z.record(z.unknown()).optional(),
    policyName: z.string().trim().min(1),
    requiredAcr: z.literal('urn:cubid:acr:passkey').nullable().optional(),
    sandboxMode: z.boolean(),
    signingEnabled: z.boolean(),
    status: z.enum(['disabled', 'enabled', 'suspended']),
    transactionValueLimitUsd: z.coerce.number().nonnegative().nullable().optional(),
    webhookEventSubscriptions: z.array(z.string().trim().min(1)).optional(),
  })
  .passthrough();
