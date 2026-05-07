'use client';

import type {
  ClaimAvailabilityMode,
  ClaimComputationMethod,
  ClaimRegistryRecord,
  CubidClaimClassification,
  IdentityDepthThresholdPolicy,
  OidcScope,
} from '@cubid/claims';
import dayjs from 'dayjs';
import useAuth from 'hooks/useAuth';
import { authedPost } from 'lib/api';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import {
  type OidcAdminClientSummary,
  type OidcAdminMetadataPayload,
  type OidcClientClaimPolicyBindingRecord,
} from './shared';

interface ClaimFormState {
  availabilityMode: ClaimAvailabilityMode;
  claimId: string | null;
  claimName: string;
  classification: CubidClaimClassification;
  computationMethod: ClaimComputationMethod;
  description: string;
  displayName: string;
  metadataJson: string;
  requiresExplicitConsent: boolean;
  scopes: OidcScope[];
  tokenEligible: boolean;
  userinfoEligible: boolean;
}

interface PolicyFormState {
  description: string;
  metadataJson: string;
  minimumScoreBand: string;
  name: string;
  policyId: string | null;
  requiredStampKeys: string;
  requiredVerificationClaims: string[];
  targetClaims: string[];
  targetScopes: OidcScope[];
}

interface BindingFormState {
  bindingId: string | null;
  claimName: string;
  clientId: string;
  enabled: boolean;
  metadataJson: string;
  policyId: string;
}

const createEmptyClaimForm = (): ClaimFormState => ({
  availabilityMode: 'global',
  claimId: null,
  claimName: '',
  classification: 'json',
  computationMethod: 'custom_json',
  description: '',
  displayName: '',
  metadataJson: '{}',
  requiresExplicitConsent: true,
  scopes: [],
  tokenEligible: false,
  userinfoEligible: true,
});

const createEmptyPolicyForm = (): PolicyFormState => ({
  description: '',
  metadataJson: '{}',
  minimumScoreBand: '',
  name: '',
  policyId: null,
  requiredStampKeys: '',
  requiredVerificationClaims: [],
  targetClaims: [],
  targetScopes: [],
});

const createEmptyBindingForm = (): BindingFormState => ({
  bindingId: null,
  claimName: '',
  clientId: '',
  enabled: true,
  metadataJson: '{}',
  policyId: '',
});

const parseMetadataJson = (value: string, label: string) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(trimmedValue);

    if (typeof parsedValue !== 'object' || parsedValue === null || Array.isArray(parsedValue)) {
      throw new Error();
    }

    return parsedValue as Record<string, unknown>;
  } catch {
    throw new Error(`${label} must be valid JSON object`);
  }
};

const toggleString = <T extends string>(currentValues: T[], nextValue: T) => {
  if (currentValues.includes(nextValue)) {
    return currentValues.filter((value) => value !== nextValue);
  }

  return [...currentValues, nextValue];
};

const parseCommaSeparatedValues = (value: string) => {
  return [...new Set(value.split(',').map((entry) => entry.trim()).filter(Boolean))];
};

const formatList = (values: readonly string[]) => {
  if (values.length === 0) {
    return 'None';
  }

  return values.join(', ');
};

const findClientName = (
  clients: OidcAdminClientSummary[],
  clientId: string,
) => {
  return clients.find((client) => client.clientId === clientId)?.clientName ?? clientId;
};

const findPolicyName = (
  policies: IdentityDepthThresholdPolicy[],
  policyId: string | null,
) => {
  if (!policyId) {
    return 'Direct claim release';
  }

  return policies.find((policy) => policy.policyId === policyId)?.name ?? policyId;
};

const SectionCard = ({
  children,
  title,
  description,
  action,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  description: string;
  title: string;
}) => {
  return (
    <section className="rounded-xl border border-gray-800 bg-gray-850/70 bg-gray-800 p-5 shadow-lg">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-gray-400">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
};

const StatCard = ({ label, value }: { label: string; value: number }) => {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-800 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
};

const InputLabel = ({ label }: { label: string }) => {
  return <label className="text-sm font-medium text-gray-300">{label}</label>;
};

const SecondaryButton = ({
  children,
  disabled,
  onClick,
  type = 'button',
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) => {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-gray-700 bg-transparent px-4 py-2 text-sm font-medium text-gray-200 transition hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
};

const PrimaryButton = ({
  children,
  disabled,
  type = 'button',
}: {
  children: React.ReactNode;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) => {
  return (
    <button
      type={type}
      disabled={disabled}
      className="rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
};

export default function OidcRegistry() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clients, setClients] = useState<OidcAdminClientSummary[]>([]);
  const [claims, setClaims] = useState<ClaimRegistryRecord[]>([]);
  const [policies, setPolicies] = useState<IdentityDepthThresholdPolicy[]>([]);
  const [bindings, setBindings] = useState<OidcClientClaimPolicyBindingRecord[]>([]);
  const [metadata, setMetadata] = useState<OidcAdminMetadataPayload['metadata'] | null>(null);
  const [claimForm, setClaimForm] = useState<ClaimFormState>(createEmptyClaimForm());
  const [policyForm, setPolicyForm] = useState<PolicyFormState>(createEmptyPolicyForm());
  const [bindingForm, setBindingForm] = useState<BindingFormState>(createEmptyBindingForm());
  const [claimSaving, setClaimSaving] = useState(false);
  const [policySaving, setPolicySaving] = useState(false);
  const [bindingSaving, setBindingSaving] = useState(false);

  const loadRegistry = async (showRefreshingState = false) => {
    if (showRefreshingState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [metadataResponse, bindingsResponse] = await Promise.all([
        authedPost<{ data: OidcAdminMetadataPayload }>('/api/admin/oidc/metadata', {}),
        authedPost<{ data: OidcClientClaimPolicyBindingRecord[] }>(
          '/api/admin/oidc/bindings/list',
          {},
        ),
      ]);

      setClients(metadataResponse.data.data.clients ?? []);
      setClaims(metadataResponse.data.data.claims ?? []);
      setPolicies(metadataResponse.data.data.policies ?? []);
      setMetadata(metadataResponse.data.data.metadata ?? null);
      setBindings(bindingsResponse.data.data ?? []);
    } catch {
      toast.error('Failed to load OIDC registry data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.email) {
      loadRegistry();
    }
  }, [user?.email]);

  const resetClaimForm = () => {
    setClaimForm(createEmptyClaimForm());
  };

  const resetPolicyForm = () => {
    setPolicyForm(createEmptyPolicyForm());
  };

  const resetBindingForm = () => {
    setBindingForm(createEmptyBindingForm());
  };

  const submitClaim = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setClaimSaving(true);

      await authedPost('/api/admin/oidc/claims/upsert', {
        availabilityMode: claimForm.availabilityMode,
        claimId: claimForm.claimId,
        claimName: claimForm.claimName,
        classification: claimForm.classification,
        computationMethod: claimForm.computationMethod,
        description: claimForm.description,
        displayName: claimForm.displayName,
        metadata: parseMetadataJson(claimForm.metadataJson, 'Claim metadata'),
        requiresExplicitConsent: claimForm.requiresExplicitConsent,
        scopes: claimForm.scopes,
        tokenEligible: claimForm.tokenEligible,
        userinfoEligible: claimForm.userinfoEligible,
      });

      toast.success(claimForm.claimId ? 'Claim updated' : 'Claim created');
      resetClaimForm();
      await loadRegistry(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save claim');
    } finally {
      setClaimSaving(false);
    }
  };

  const editClaim = (claim: ClaimRegistryRecord) => {
    setClaimForm({
      availabilityMode: claim.availabilityMode,
      claimId: claim.claimId,
      claimName: claim.name,
      classification: claim.classification,
      computationMethod: claim.computationMethod,
      description: claim.description,
      displayName: claim.displayName,
      metadataJson: JSON.stringify(claim.metadata ?? {}, null, 2),
      requiresExplicitConsent: claim.requiresExplicitConsent,
      scopes: [...claim.scopes],
      tokenEligible: claim.tokenEligible,
      userinfoEligible: claim.userinfoEligible,
    });
  };

  const archiveClaim = async (claim: ClaimRegistryRecord) => {
    try {
      await authedPost('/api/admin/oidc/claims/archive', {
        claimId: claim.claimId,
      });
      toast.success(`Archived ${claim.displayName}`);
      resetClaimForm();
      await loadRegistry(true);
    } catch {
      toast.error(`Failed to archive ${claim.displayName}`);
    }
  };

  const submitPolicy = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setPolicySaving(true);

      await authedPost('/api/admin/oidc/policies/upsert', {
        description: policyForm.description,
        metadata: parseMetadataJson(policyForm.metadataJson, 'Policy metadata'),
        minimumScoreBand: policyForm.minimumScoreBand || null,
        name: policyForm.name,
        policyId: policyForm.policyId,
        requiredStampKeys: parseCommaSeparatedValues(policyForm.requiredStampKeys),
        requiredVerificationClaims: policyForm.requiredVerificationClaims,
        targetClaims: policyForm.targetClaims,
        targetScopes: policyForm.targetScopes,
      });

      toast.success(policyForm.policyId ? 'Policy updated' : 'Policy created');
      resetPolicyForm();
      await loadRegistry(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save policy');
    } finally {
      setPolicySaving(false);
    }
  };

  const editPolicy = (policy: IdentityDepthThresholdPolicy) => {
    setPolicyForm({
      description: policy.description,
      metadataJson: JSON.stringify(policy.metadata ?? {}, null, 2),
      minimumScoreBand: policy.minimumScoreBand ?? '',
      name: policy.name,
      policyId: policy.policyId,
      requiredStampKeys: policy.requiredStampKeys.join(', '),
      requiredVerificationClaims: [...policy.requiredVerificationClaims],
      targetClaims: [...policy.targetClaims],
      targetScopes: [...policy.targetScopes],
    });
  };

  const archivePolicy = async (policy: IdentityDepthThresholdPolicy) => {
    try {
      await authedPost('/api/admin/oidc/policies/archive', {
        policyId: policy.policyId,
      });
      toast.success(`Archived ${policy.name}`);
      resetPolicyForm();
      await loadRegistry(true);
    } catch {
      toast.error(`Failed to archive ${policy.name}`);
    }
  };

  const submitBinding = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setBindingSaving(true);

      await authedPost('/api/admin/oidc/bindings/upsert', {
        bindingId: bindingForm.bindingId,
        claimName: bindingForm.claimName,
        clientId: bindingForm.clientId,
        enabled: bindingForm.enabled,
        metadata: parseMetadataJson(bindingForm.metadataJson, 'Binding metadata'),
        policyId: bindingForm.policyId || null,
      });

      toast.success(bindingForm.bindingId ? 'Binding updated' : 'Binding created');
      resetBindingForm();
      await loadRegistry(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save binding');
    } finally {
      setBindingSaving(false);
    }
  };

  const editBinding = (binding: OidcClientClaimPolicyBindingRecord) => {
    setBindingForm({
      bindingId: binding.bindingId,
      claimName: binding.claimName,
      clientId: binding.clientId,
      enabled: binding.enabled,
      metadataJson: JSON.stringify(binding.metadata ?? {}, null, 2),
      policyId: binding.policyId ?? '',
    });
  };

  const archiveBinding = async (binding: OidcClientClaimPolicyBindingRecord) => {
    try {
      await authedPost('/api/admin/oidc/bindings/archive', {
        bindingId: binding.bindingId,
      });
      toast.success('Binding archived');
      resetBindingForm();
      await loadRegistry(true);
    } catch {
      toast.error('Failed to archive binding');
    }
  };

  if (loading) {
    return <div className="p-3 text-sm text-gray-400">Loading claim registry...</div>;
  }

  if (!metadata) {
    return <div className="p-3 text-sm text-gray-400">OIDC registry metadata is unavailable.</div>;
  }

  const editableClaims = claims.filter((claim) => claim.source === 'admin');

  return (
    <div className="space-y-6 p-3">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">OIDC Claims & Policies</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-400">
            Manage registry claims, threshold-based identity-depth policies, and the client bindings that decide which relying parties can receive each claim.
          </p>
        </div>
        <SecondaryButton disabled={refreshing} onClick={() => loadRegistry(true)}>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </SecondaryButton>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="OIDC clients" value={clients.length} />
        <StatCard label="Active claims" value={claims.length} />
        <StatCard label="Admin claims" value={editableClaims.length} />
        <StatCard label="Active bindings" value={bindings.length} />
      </div>

      <SectionCard
        title="Claims"
        description="Seeded issuer claims are read-only here. Operator-defined claims can be created, edited, archived, and bound to individual relying parties."
        action={<span className="text-xs uppercase tracking-wide text-gray-500">{claims.length} active claims</span>}
      >
        <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="min-w-full text-left text-sm text-gray-200">
              <thead className="bg-gray-900/80 text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3">Claim</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Scopes</th>
                  <th className="px-4 py-3">Bindings</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr key={claim.claimId} className="border-t border-gray-800 align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{claim.displayName}</div>
                      <div className="text-xs text-gray-500">{claim.name}</div>
                      <div className="mt-2 text-xs text-gray-400">{claim.description}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300">
                      <div>{claim.classification}</div>
                      <div className="mt-1 text-gray-500">{claim.source}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300">{formatList(claim.scopes)}</td>
                    <td className="px-4 py-3 text-xs text-gray-300">{claim.boundClientIds.length}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {claim.source === 'admin' ? (
                          <>
                            <SecondaryButton onClick={() => editClaim(claim)}>Edit</SecondaryButton>
                            <SecondaryButton onClick={() => archiveClaim(claim)}>Archive</SecondaryButton>
                          </>
                        ) : (
                          <span className="text-xs text-gray-500">Seeded</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form onSubmit={submitClaim} className="space-y-4 rounded-lg border border-gray-800 bg-gray-900/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">
                  {claimForm.claimId ? 'Edit admin claim' : 'Create admin claim'}
                </h3>
                <p className="text-sm text-gray-400">Define the claim contract operators can release to relying parties.</p>
              </div>
              <SecondaryButton onClick={resetClaimForm}>Reset</SecondaryButton>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <InputLabel label="Claim name" />
                <input
                  value={claimForm.claimName}
                  disabled={Boolean(claimForm.claimId)}
                  onChange={(event) => setClaimForm((current) => ({ ...current, claimName: event.target.value }))}
                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="partner:risk_score"
                />
              </div>
              <div className="space-y-2">
                <InputLabel label="Display name" />
                <input
                  value={claimForm.displayName}
                  onChange={(event) => setClaimForm((current) => ({ ...current, displayName: event.target.value }))}
                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Partner Risk Score"
                />
              </div>
            </div>

            <div className="space-y-2">
              <InputLabel label="Description" />
              <textarea
                value={claimForm.description}
                onChange={(event) => setClaimForm((current) => ({ ...current, description: event.target.value }))}
                className="min-h-[96px] w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                placeholder="Describe what this claim represents and how operators should use it."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <InputLabel label="Classification" />
                <select
                  value={claimForm.classification}
                  onChange={(event) => setClaimForm((current) => ({
                    ...current,
                    classification: event.target.value as CubidClaimClassification,
                  }))}
                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  {metadata.claimClassifications.map((classification) => (
                    <option key={classification} value={classification}>
                      {classification}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <InputLabel label="Computation method" />
                <select
                  value={claimForm.computationMethod}
                  onChange={(event) => setClaimForm((current) => ({
                    ...current,
                    computationMethod: event.target.value as ClaimComputationMethod,
                  }))}
                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  {metadata.claimComputationMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <InputLabel label="Availability" />
                <select
                  value={claimForm.availabilityMode}
                  onChange={(event) => setClaimForm((current) => ({
                    ...current,
                    availabilityMode: event.target.value as ClaimAvailabilityMode,
                  }))}
                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  {metadata.availabilityModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <InputLabel label="Scopes" />
              <div className="grid gap-2 md:grid-cols-2">
                {metadata.allScopes.map((scope) => (
                  <label key={scope} className="flex items-center gap-2 rounded-md border border-gray-800 bg-gray-800 px-3 py-2 text-sm text-gray-200">
                    <input
                      type="checkbox"
                      checked={claimForm.scopes.includes(scope)}
                      onChange={() => setClaimForm((current) => ({
                        ...current,
                        scopes: toggleString(current.scopes, scope),
                      }))}
                    />
                    <span>{scope}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              <label className="flex items-center gap-2 rounded-md border border-gray-800 bg-gray-800 px-3 py-2 text-sm text-gray-200">
                <input
                  type="checkbox"
                  checked={claimForm.tokenEligible}
                  onChange={(event) => setClaimForm((current) => ({ ...current, tokenEligible: event.target.checked }))}
                />
                <span>Token eligible</span>
              </label>
              <label className="flex items-center gap-2 rounded-md border border-gray-800 bg-gray-800 px-3 py-2 text-sm text-gray-200">
                <input
                  type="checkbox"
                  checked={claimForm.userinfoEligible}
                  onChange={(event) => setClaimForm((current) => ({ ...current, userinfoEligible: event.target.checked }))}
                />
                <span>UserInfo eligible</span>
              </label>
              <label className="flex items-center gap-2 rounded-md border border-gray-800 bg-gray-800 px-3 py-2 text-sm text-gray-200">
                <input
                  type="checkbox"
                  checked={claimForm.requiresExplicitConsent}
                  onChange={(event) => setClaimForm((current) => ({
                    ...current,
                    requiresExplicitConsent: event.target.checked,
                  }))}
                />
                <span>Needs explicit consent</span>
              </label>
            </div>

            <div className="space-y-2">
              <InputLabel label="Metadata JSON" />
              <textarea
                value={claimForm.metadataJson}
                onChange={(event) => setClaimForm((current) => ({ ...current, metadataJson: event.target.value }))}
                className="min-h-[112px] w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3">
              <SecondaryButton onClick={resetClaimForm}>Cancel</SecondaryButton>
              <PrimaryButton type="submit" disabled={claimSaving}>
                {claimSaving ? 'Saving...' : claimForm.claimId ? 'Save claim' : 'Create claim'}
              </PrimaryButton>
            </div>
          </form>
        </div>
      </SectionCard>

      <SectionCard
        title="Identity-depth policies"
        description="Define threshold-based rules that gate which clients can receive a claim and what score or verification bar the subject must satisfy."
        action={<span className="text-xs uppercase tracking-wide text-gray-500">{policies.length} active policies</span>}
      >
        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="min-w-full text-left text-sm text-gray-200">
              <thead className="bg-gray-900/80 text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3">Policy</th>
                  <th className="px-4 py-3">Targets</th>
                  <th className="px-4 py-3">Requirements</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => (
                  <tr key={policy.policyId} className="border-t border-gray-800 align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{policy.name}</div>
                      <div className="text-xs text-gray-500">v{policy.policyVersion}</div>
                      <div className="mt-2 text-xs text-gray-400">{policy.description}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300">
                      <div>Claims: {formatList(policy.targetClaims)}</div>
                      <div className="mt-2">Scopes: {formatList(policy.targetScopes)}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300">
                      <div>Min band: {policy.minimumScoreBand ?? 'None'}</div>
                      <div className="mt-2">Verification claims: {formatList(policy.requiredVerificationClaims)}</div>
                      <div className="mt-2">Stamp keys: {formatList(policy.requiredStampKeys)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <SecondaryButton onClick={() => editPolicy(policy)}>Edit</SecondaryButton>
                        <SecondaryButton onClick={() => archivePolicy(policy)}>Archive</SecondaryButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form onSubmit={submitPolicy} className="space-y-4 rounded-lg border border-gray-800 bg-gray-900/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">
                  {policyForm.policyId ? 'Edit threshold policy' : 'Create threshold policy'}
                </h3>
                <p className="text-sm text-gray-400">Policies version themselves on every save so issuers can audit what changed.</p>
              </div>
              <SecondaryButton onClick={resetPolicyForm}>Reset</SecondaryButton>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <InputLabel label="Policy name" />
                <input
                  value={policyForm.name}
                  onChange={(event) => setPolicyForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  placeholder="trusted_app_profile_gate"
                />
              </div>
              <div className="space-y-2">
                <InputLabel label="Minimum score band" />
                <select
                  value={policyForm.minimumScoreBand}
                  onChange={(event) => setPolicyForm((current) => ({
                    ...current,
                    minimumScoreBand: event.target.value,
                  }))}
                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">No minimum</option>
                  {metadata.supportedMinimumScoreBands.map((scoreBand) => (
                    <option key={scoreBand} value={scoreBand}>
                      {scoreBand}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <InputLabel label="Description" />
              <textarea
                value={policyForm.description}
                onChange={(event) => setPolicyForm((current) => ({ ...current, description: event.target.value }))}
                className="min-h-[96px] w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <InputLabel label="Target claims" />
              <div className="grid gap-2 md:grid-cols-2">
                {claims.map((claim) => (
                  <label key={claim.claimId} className="flex items-center gap-2 rounded-md border border-gray-800 bg-gray-800 px-3 py-2 text-sm text-gray-200">
                    <input
                      type="checkbox"
                      checked={policyForm.targetClaims.includes(claim.name)}
                      onChange={() => setPolicyForm((current) => ({
                        ...current,
                        targetClaims: toggleString(current.targetClaims, claim.name),
                      }))}
                    />
                    <span>{claim.displayName}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <InputLabel label="Target scopes" />
              <div className="grid gap-2 md:grid-cols-2">
                {metadata.allScopes.map((scope) => (
                  <label key={scope} className="flex items-center gap-2 rounded-md border border-gray-800 bg-gray-800 px-3 py-2 text-sm text-gray-200">
                    <input
                      type="checkbox"
                      checked={policyForm.targetScopes.includes(scope)}
                      onChange={() => setPolicyForm((current) => ({
                        ...current,
                        targetScopes: toggleString(current.targetScopes, scope),
                      }))}
                    />
                    <span>{scope}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <InputLabel label="Required verification claims" />
              <div className="grid gap-2 md:grid-cols-2">
                {claims.map((claim) => (
                  <label key={`verification-${claim.claimId}`} className="flex items-center gap-2 rounded-md border border-gray-800 bg-gray-800 px-3 py-2 text-sm text-gray-200">
                    <input
                      type="checkbox"
                      checked={policyForm.requiredVerificationClaims.includes(claim.name)}
                      onChange={() => setPolicyForm((current) => ({
                        ...current,
                        requiredVerificationClaims: toggleString(
                          current.requiredVerificationClaims,
                          claim.name,
                        ),
                      }))}
                    />
                    <span>{claim.displayName}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <InputLabel label="Required stamp keys" />
              <input
                value={policyForm.requiredStampKeys}
                onChange={(event) => setPolicyForm((current) => ({
                  ...current,
                  requiredStampKeys: event.target.value,
                }))}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                placeholder="passport, liveness, poap_holder"
              />
              <p className="text-xs text-gray-500">Comma-separated stamp keys.</p>
            </div>

            <div className="space-y-2">
              <InputLabel label="Metadata JSON" />
              <textarea
                value={policyForm.metadataJson}
                onChange={(event) => setPolicyForm((current) => ({ ...current, metadataJson: event.target.value }))}
                className="min-h-[112px] w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3">
              <SecondaryButton onClick={resetPolicyForm}>Cancel</SecondaryButton>
              <PrimaryButton type="submit" disabled={policySaving}>
                {policySaving ? 'Saving...' : policyForm.policyId ? 'Save policy' : 'Create policy'}
              </PrimaryButton>
            </div>
          </form>
        </div>
      </SectionCard>

      <SectionCard
        title="Client bindings"
        description="Bind claims to specific OIDC clients, optionally requiring a policy gate before the claim can be released."
        action={<span className="text-xs uppercase tracking-wide text-gray-500">{bindings.length} active bindings</span>}
      >
        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="min-w-full text-left text-sm text-gray-200">
              <thead className="bg-gray-900/80 text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Claim</th>
                  <th className="px-4 py-3">Policy</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bindings.map((binding) => (
                  <tr key={binding.bindingId} className="border-t border-gray-800 align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{findClientName(clients, binding.clientId)}</div>
                      <div className="text-xs text-gray-500">{binding.clientId}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300">{binding.claimName}</td>
                    <td className="px-4 py-3 text-xs text-gray-300">{findPolicyName(policies, binding.policyId)}</td>
                    <td className="px-4 py-3 text-xs text-gray-300">{dayjs(binding.updatedAt).format('D MMM YYYY, h:mm A')}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <SecondaryButton onClick={() => editBinding(binding)}>Edit</SecondaryButton>
                        <SecondaryButton onClick={() => archiveBinding(binding)}>Archive</SecondaryButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form onSubmit={submitBinding} className="space-y-4 rounded-lg border border-gray-800 bg-gray-900/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">
                  {bindingForm.bindingId ? 'Edit binding' : 'Create binding'}
                </h3>
                <p className="text-sm text-gray-400">Client and claim are fixed after creation. Edit the policy or enabled state later if the release gate changes.</p>
              </div>
              <SecondaryButton onClick={resetBindingForm}>Reset</SecondaryButton>
            </div>

            <div className="space-y-2">
              <InputLabel label="OIDC client" />
              <select
                value={bindingForm.clientId}
                disabled={Boolean(bindingForm.bindingId)}
                onChange={(event) => setBindingForm((current) => ({ ...current, clientId: event.target.value }))}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client.clientId} value={client.clientId}>
                    {client.clientName} ({client.clientId})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <InputLabel label="Claim" />
              <select
                value={bindingForm.claimName}
                disabled={Boolean(bindingForm.bindingId)}
                onChange={(event) => setBindingForm((current) => ({ ...current, claimName: event.target.value }))}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Select a claim</option>
                {claims.map((claim) => (
                  <option key={claim.claimId} value={claim.name}>
                    {claim.displayName} ({claim.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <InputLabel label="Policy gate" />
              <select
                value={bindingForm.policyId}
                onChange={(event) => setBindingForm((current) => ({ ...current, policyId: event.target.value }))}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">No policy gate</option>
                {policies.map((policy) => (
                  <option key={policy.policyId} value={policy.policyId}>
                    {policy.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 rounded-md border border-gray-800 bg-gray-800 px-3 py-2 text-sm text-gray-200">
              <input
                type="checkbox"
                checked={bindingForm.enabled}
                onChange={(event) => setBindingForm((current) => ({ ...current, enabled: event.target.checked }))}
              />
              <span>Binding enabled</span>
            </label>

            <div className="space-y-2">
              <InputLabel label="Metadata JSON" />
              <textarea
                value={bindingForm.metadataJson}
                onChange={(event) => setBindingForm((current) => ({ ...current, metadataJson: event.target.value }))}
                className="min-h-[112px] w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3">
              <SecondaryButton onClick={resetBindingForm}>Cancel</SecondaryButton>
              <PrimaryButton type="submit" disabled={bindingSaving}>
                {bindingSaving ? 'Saving...' : bindingForm.bindingId ? 'Save binding' : 'Create binding'}
              </PrimaryButton>
            </div>
          </form>
        </div>
      </SectionCard>
    </div>
  );
}