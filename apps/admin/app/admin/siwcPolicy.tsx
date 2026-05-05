import { authedPost } from 'lib/api';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import type {
  SiwcPolicyChain,
  SiwcPolicyOverviewPayload,
  SiwcPolicyRecord,
  SiwcPolicyRequestType,
  SiwcPolicyStatus,
} from './shared';

const CHAINS: SiwcPolicyChain[] = ['evm', 'near', 'solana', 'sui'];
const REQUEST_TYPES: SiwcPolicyRequestType[] = [
  'message',
  'typed_data',
  'transaction',
];
const WEBHOOK_EVENTS = [
  'wallet.signing_request.created',
  'wallet.signing_request.approved',
  'wallet.signing_request.rejected',
  'wallet.signature.completed',
  'wallet.transaction.submitted',
  'wallet.transaction.failed',
  'wallet.policy.denied',
];
const PASSKEY_ACR = 'urn:cubid:acr:passkey' as const;

const toggleValue = <T extends string>(values: T[], value: T) => {
  return values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value];
};

const formatDate = (value: string | null) => {
  return value ? new Date(value).toLocaleString() : 'Not saved yet';
};

const PolicyCheckbox = ({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) => (
  <label className="flex items-center gap-2 rounded border border-gray-700 px-3 py-2 text-sm text-gray-200">
    <input
      checked={checked}
      className="h-4 w-4"
      onChange={onChange}
      type="checkbox"
    />
    {label}
  </label>
);

export default function SiwcPolicy() {
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<SiwcPolicyRecord[]>([]);
  const [savingDappId, setSavingDappId] = useState<number | null>(null);

  const loadPolicies = useCallback(async () => {
    setLoading(true);

    try {
      const response = await authedPost<{ data: SiwcPolicyOverviewPayload }>(
        '/api/admin/siwc/policies/list',
        {}
      );
      setGeneratedAt(response.data.data.generatedAt);
      setPolicies(response.data.data.policies ?? []);
    } catch {
      toast.error('Failed to load SIWC policies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  const updatePolicy = (
    dappId: number,
    patch: Partial<SiwcPolicyRecord>
  ) => {
    setPolicies((current) =>
      current.map((policy) =>
        policy.dappId === dappId ? { ...policy, ...patch } : policy
      )
    );
  };

  const savePolicy = async (policy: SiwcPolicyRecord) => {
    setSavingDappId(policy.dappId);

    try {
      const response = await authedPost<{
        data: { policy: SiwcPolicyRecord };
      }>('/api/admin/siwc/policies/upsert', {
        allowedChains: policy.allowedChains,
        allowedRequestTypes: policy.allowedRequestTypes,
        contractAllowlist: policy.contractAllowlist,
        custodyEnabled: policy.custodyEnabled,
        dappId: policy.dappId,
        metadata: policy.metadata,
        policyName: policy.policyName,
        requiredAcr: policy.signingEnabled ? PASSKEY_ACR : policy.requiredAcr,
        sandboxMode: policy.sandboxMode,
        signingEnabled: policy.signingEnabled,
        status: policy.status,
        transactionValueLimitUsd: policy.transactionValueLimitUsd,
        webhookEventSubscriptions: policy.webhookEventSubscriptions,
      });
      const savedPolicy = response.data.data.policy;
      setPolicies((current) =>
        current.map((entry) =>
          entry.dappId === savedPolicy.dappId ? savedPolicy : entry
        )
      );
      toast.success(`Saved SIWC policy for ${savedPolicy.dappName}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save SIWC policy';
      toast.error(message);
    } finally {
      setSavingDappId(null);
    }
  };

  return (
    <div className="p-3 text-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl">SIWC Policy</h2>
          <p className="mt-1 max-w-3xl text-sm text-gray-400">
            Configure whether each app can use app-scoped account custody and
            future signing. These controls do not execute signing yet; they
            define the policy SIWC signing routes must enforce later.
          </p>
          {generatedAt ? (
            <p className="mt-2 text-xs text-gray-500">
              Generated {formatDate(generatedAt)}
            </p>
          ) : null}
        </div>
        <button
          className="rounded bg-gray-700 px-3 py-2 text-sm font-semibold hover:bg-gray-600"
          onClick={loadPolicies}
          type="button"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="mt-6 text-gray-400">Loading SIWC policies...</p>
      ) : policies.length === 0 ? (
        <p className="mt-6 text-gray-400">No dapps found.</p>
      ) : (
        <div className="mt-5 space-y-5">
          {policies.map((policy) => (
            <section
              className="rounded-lg border border-gray-800 bg-gray-900 p-4 shadow"
              key={policy.dappId}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{policy.dappName}</h3>
                  <p className="text-xs text-gray-500">
                    App ID {policy.dappId}
                    {policy.dappUid ? ` · UID ${policy.dappUid}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Policy v{policy.policyVersion} · Updated{' '}
                    {formatDate(policy.updatedAt)}
                  </p>
                </div>
                <button
                  className="rounded bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-600"
                  disabled={savingDappId === policy.dappId}
                  onClick={() => savePolicy(policy)}
                  type="button"
                >
                  {savingDappId === policy.dappId ? 'Saving...' : 'Save policy'}
                </button>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <label className="text-sm text-gray-300">
                  Policy name
                  <input
                    className="mt-1 w-full rounded bg-gray-800 p-2 text-white"
                    onChange={(event) =>
                      updatePolicy(policy.dappId, {
                        policyName: event.target.value,
                      })
                    }
                    value={policy.policyName}
                  />
                </label>
                <label className="text-sm text-gray-300">
                  Status
                  <select
                    className="mt-1 w-full rounded bg-gray-800 p-2 text-white"
                    onChange={(event) =>
                      updatePolicy(policy.dappId, {
                        status: event.target.value as SiwcPolicyStatus,
                      })
                    }
                    value={policy.status}
                  >
                    <option value="disabled">Disabled</option>
                    <option value="enabled">Enabled</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </label>
                <label className="text-sm text-gray-300">
                  Transaction value limit USD
                  <input
                    className="mt-1 w-full rounded bg-gray-800 p-2 text-white"
                    min={0}
                    onChange={(event) =>
                      updatePolicy(policy.dappId, {
                        transactionValueLimitUsd: event.target.value
                          ? Number(event.target.value)
                          : null,
                      })
                    }
                    type="number"
                    value={policy.transactionValueLimitUsd ?? ''}
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <PolicyCheckbox
                  checked={policy.custodyEnabled}
                  label="Custody enabled"
                  onChange={() =>
                    updatePolicy(policy.dappId, {
                      custodyEnabled: !policy.custodyEnabled,
                    })
                  }
                />
                <PolicyCheckbox
                  checked={policy.signingEnabled}
                  label="Signing enabled"
                  onChange={() =>
                    updatePolicy(policy.dappId, {
                      requiredAcr: !policy.signingEnabled ? PASSKEY_ACR : null,
                      signingEnabled: !policy.signingEnabled,
                    })
                  }
                />
                <PolicyCheckbox
                  checked={policy.sandboxMode}
                  label="Sandbox mode"
                  onChange={() =>
                    updatePolicy(policy.dappId, {
                      sandboxMode: !policy.sandboxMode,
                    })
                  }
                />
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-gray-300">
                    Allowed chains
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {CHAINS.map((chain) => (
                      <PolicyCheckbox
                        checked={policy.allowedChains.includes(chain)}
                        key={chain}
                        label={chain.toUpperCase()}
                        onChange={() =>
                          updatePolicy(policy.dappId, {
                            allowedChains: toggleValue(
                              policy.allowedChains,
                              chain
                            ),
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-300">
                    Allowed request types
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {REQUEST_TYPES.map((requestType) => (
                      <PolicyCheckbox
                        checked={policy.allowedRequestTypes.includes(
                          requestType
                        )}
                        key={requestType}
                        label={requestType}
                        onChange={() =>
                          updatePolicy(policy.dappId, {
                            allowedRequestTypes: toggleValue(
                              policy.allowedRequestTypes,
                              requestType
                            ),
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <label className="text-sm text-gray-300">
                  Contract allowlist
                  <textarea
                    className="mt-1 h-24 w-full rounded bg-gray-800 p-2 text-white"
                    onChange={(event) =>
                      updatePolicy(policy.dappId, {
                        contractAllowlist: event.target.value
                          .split('\n')
                          .map((value) => value.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="One contract or recipient per line"
                    value={policy.contractAllowlist.join('\n')}
                  />
                </label>
                <div>
                  <p className="text-sm font-semibold text-gray-300">
                    Webhook subscriptions
                  </p>
                  <div className="mt-2 grid gap-2">
                    {WEBHOOK_EVENTS.map((eventName) => (
                      <PolicyCheckbox
                        checked={policy.webhookEventSubscriptions.includes(
                          eventName
                        )}
                        key={eventName}
                        label={eventName}
                        onChange={() =>
                          updatePolicy(policy.dappId, {
                            webhookEventSubscriptions: toggleValue(
                              policy.webhookEventSubscriptions,
                              eventName
                            ),
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded border border-gray-800 bg-black/20 p-3 text-xs text-gray-400">
                Required ACR:{' '}
                <span className="font-mono">
                  {policy.signingEnabled ? PASSKEY_ACR : 'none'}
                </span>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
