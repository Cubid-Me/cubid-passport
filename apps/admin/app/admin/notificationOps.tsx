import { authedPost } from 'lib/api';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

type CategoryKey = 'SECURITY' | 'TRANSACTIONAL' | 'WORKFLOW';
type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
type ProviderKey = 'email_smtp' | 'telegram_bot';
type ProviderStatus = 'active' | 'disabled' | 'suspended';
type PolicyStatus = 'disabled' | 'enabled' | 'suspended';

type NotificationCategory = {
  categoryKey: CategoryKey;
  defaultPriority: Priority;
  description: string | null;
  displayName: string;
  marketingLike: boolean;
  requiresExplicitGrant: boolean;
  status: 'active' | 'disabled';
  updatedAt: string | null;
};

type NotificationProvider = {
  channelType: string | null;
  displayName: string;
  providerKey: ProviderKey;
  status: ProviderStatus;
  supportsDelivery: boolean;
  supportsVerification: boolean;
  updatedAt: string | null;
};

type NotificationAppPolicy = {
  allowedCategories: CategoryKey[];
  allowedPriorities: Priority[];
  allowedProviders: ProviderKey[];
  dailyLimit: number;
  dappId: number;
  dappName: string;
  dappUid: string | null;
  minuteLimit: number;
  policyName: string;
  policyVersion: number;
  sandboxMode: boolean;
  securityCategoryEnabled: boolean;
  status: PolicyStatus;
  updatedAt: string | null;
};

type NotificationEvent = {
  categoryKey: string | null;
  createdAt: string | null;
  dappId: number | null;
  deniedReason: string | null;
  eventId: string | null;
  priority: string | null;
  selectedChannelType: string | null;
  status: string | null;
};

type NotificationOverview = {
  appPolicies: NotificationAppPolicy[];
  categories: NotificationCategory[];
  generatedAt: string;
  providers: NotificationProvider[];
  recentEvents: NotificationEvent[];
  totals: {
    attemptsByProvider: Record<string, number>;
    attemptsByStatus: Record<string, number>;
    eventsByStatus: Record<string, number>;
  };
};

const CATEGORIES: CategoryKey[] = ['SECURITY', 'TRANSACTIONAL', 'WORKFLOW'];
const PRIORITIES: Priority[] = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];
const PROVIDERS: ProviderKey[] = ['email_smtp', 'telegram_bot'];

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleString() : 'Not saved yet';

const toggleValue = <T extends string>(values: T[], value: T) =>
  values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value];

const CountPills = ({ counts }: { counts: Record<string, number> }) => (
  <div className="flex flex-wrap gap-2">
    {Object.entries(counts).length === 0 ? (
      <span className="text-sm text-gray-500">No activity yet</span>
    ) : (
      Object.entries(counts).map(([key, value]) => (
        <span
          className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-200"
          key={key}
        >
          {key}: {value}
        </span>
      ))
    )}
  </div>
);

export default function NotificationOps() {
  const [overview, setOverview] = useState<NotificationOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);

    try {
      const response = await authedPost<{ data: NotificationOverview }>(
        '/api/admin/notifications/overview',
        {}
      );
      setOverview(response.data.data);
    } catch {
      toast.error('Failed to load notification operations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const updatePolicy = (
    dappId: number,
    patch: Partial<NotificationAppPolicy>
  ) => {
    setOverview((current) =>
      current
        ? {
            ...current,
            appPolicies: current.appPolicies.map((policy) =>
              policy.dappId === dappId ? { ...policy, ...patch } : policy
            ),
          }
        : current
    );
  };

  const saveProvider = async (provider: NotificationProvider) => {
    setSaving(`provider-${provider.providerKey}`);

    try {
      const response = await authedPost<{
        data: { provider: NotificationProvider };
      }>('/api/admin/notifications/providers/update', {
        providerKey: provider.providerKey,
        status: provider.status,
      });
      const saved = response.data.data.provider;
      setOverview((current) =>
        current
          ? {
              ...current,
              providers: current.providers.map((entry) =>
                entry.providerKey === saved.providerKey ? saved : entry
              ),
            }
          : current
      );
      toast.success(`Saved ${saved.displayName} provider`);
    } catch {
      toast.error('Failed to save notification provider');
    } finally {
      setSaving(null);
    }
  };

  const saveCategory = async (category: NotificationCategory) => {
    setSaving(`category-${category.categoryKey}`);

    try {
      const response = await authedPost<{
        data: { category: NotificationCategory };
      }>('/api/admin/notifications/categories/upsert', {
        categoryKey: category.categoryKey,
        defaultPriority: category.defaultPriority,
        description: category.description,
        displayName: category.displayName,
        status: category.status,
      });
      const saved = response.data.data.category;
      setOverview((current) =>
        current
          ? {
              ...current,
              categories: current.categories.map((entry) =>
                entry.categoryKey === saved.categoryKey ? saved : entry
              ),
            }
          : current
      );
      toast.success(`Saved ${saved.displayName}`);
    } catch {
      toast.error('Failed to save notification category');
    } finally {
      setSaving(null);
    }
  };

  const savePolicy = async (policy: NotificationAppPolicy) => {
    setSaving(`policy-${policy.dappId}`);

    try {
      const response = await authedPost<{
        data: { policy: NotificationAppPolicy };
      }>('/api/admin/notifications/app-policy/upsert', {
        allowedCategories: policy.allowedCategories,
        allowedPriorities: policy.allowedPriorities,
        allowedProviders: policy.allowedProviders,
        dailyLimit: policy.dailyLimit,
        dappId: policy.dappId,
        minuteLimit: policy.minuteLimit,
        policyName: policy.policyName,
        sandboxMode: policy.sandboxMode,
        securityCategoryEnabled: policy.securityCategoryEnabled,
        status: policy.status,
      });
      const saved = response.data.data.policy;
      updatePolicy(saved.dappId, saved);
      toast.success(`Saved notification policy for ${saved.dappName}`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to save notification policy';
      toast.error(message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <p className="p-3 text-gray-400">Loading notification controls...</p>;
  }

  if (!overview) {
    return (
      <div className="p-3 text-gray-400">
        Notification controls could not be loaded.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-3 text-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl">Notification Controls</h2>
          <p className="mt-1 max-w-3xl text-sm text-gray-400">
            Operate flexible messaging providers, categories, app quotas, and
            delivery evidence. Raw email addresses, Telegram chat ids, and
            provider secrets are never shown here.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Generated {formatDate(overview.generatedAt)}
          </p>
        </div>
        <button
          className="rounded bg-gray-700 px-3 py-2 text-sm font-semibold hover:bg-gray-600"
          onClick={loadOverview}
          type="button"
        >
          Refresh
        </button>
      </div>

      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h3 className="text-lg font-semibold">Activity snapshot</h3>
        <div className="mt-3 grid gap-4 lg:grid-cols-3">
          <div>
            <p className="mb-2 text-sm text-gray-400">Events by status</p>
            <CountPills counts={overview.totals.eventsByStatus} />
          </div>
          <div>
            <p className="mb-2 text-sm text-gray-400">Attempts by status</p>
            <CountPills counts={overview.totals.attemptsByStatus} />
          </div>
          <div>
            <p className="mb-2 text-sm text-gray-400">Attempts by provider</p>
            <CountPills counts={overview.totals.attemptsByProvider} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h3 className="text-lg font-semibold">Providers</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {overview.providers.map((provider) => (
            <div
              className="rounded border border-gray-800 bg-gray-950 p-3"
              key={provider.providerKey}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{provider.displayName}</p>
                  <p className="text-xs text-gray-500">
                    {provider.providerKey} · {provider.channelType}
                  </p>
                </div>
                <select
                  className="rounded bg-gray-800 p-2 text-sm text-white"
                  onChange={(event) =>
                    setOverview((current) =>
                      current
                        ? {
                            ...current,
                            providers: current.providers.map((entry) =>
                              entry.providerKey === provider.providerKey
                                ? {
                                    ...entry,
                                    status: event.target
                                      .value as ProviderStatus,
                                  }
                                : entry
                            ),
                          }
                        : current
                    )
                  }
                  value={provider.status}
                >
                  <option value="disabled">Disabled</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <button
                className="mt-3 rounded bg-blue-500 px-3 py-2 text-sm font-semibold hover:bg-blue-600 disabled:bg-gray-700"
                disabled={saving === `provider-${provider.providerKey}`}
                onClick={() => saveProvider(provider)}
                type="button"
              >
                Save provider
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h3 className="text-lg font-semibold">Categories</h3>
        <div className="mt-3 space-y-3">
          {overview.categories.map((category) => (
            <div
              className="grid gap-3 rounded border border-gray-800 bg-gray-950 p-3 lg:grid-cols-5"
              key={category.categoryKey}
            >
              <div>
                <p className="font-semibold">{category.categoryKey}</p>
                <p className="text-xs text-gray-500">
                  Explicit grant: {category.requiresExplicitGrant ? 'yes' : 'no'}
                </p>
              </div>
              <input
                className="rounded bg-gray-800 p-2 text-sm text-white"
                onChange={(event) =>
                  setOverview((current) =>
                    current
                      ? {
                          ...current,
                          categories: current.categories.map((entry) =>
                            entry.categoryKey === category.categoryKey
                              ? { ...entry, displayName: event.target.value }
                              : entry
                          ),
                        }
                      : current
                  )
                }
                value={category.displayName}
              />
              <select
                className="rounded bg-gray-800 p-2 text-sm text-white"
                onChange={(event) =>
                  setOverview((current) =>
                    current
                      ? {
                          ...current,
                          categories: current.categories.map((entry) =>
                            entry.categoryKey === category.categoryKey
                              ? {
                                  ...entry,
                                  defaultPriority: event.target
                                    .value as Priority,
                                }
                              : entry
                          ),
                        }
                      : current
                  )
                }
                value={category.defaultPriority}
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
              <select
                className="rounded bg-gray-800 p-2 text-sm text-white"
                onChange={(event) =>
                  setOverview((current) =>
                    current
                      ? {
                          ...current,
                          categories: current.categories.map((entry) =>
                            entry.categoryKey === category.categoryKey
                              ? {
                                  ...entry,
                                  status: event.target.value as
                                    | 'active'
                                    | 'disabled',
                                }
                              : entry
                          ),
                        }
                      : current
                  )
                }
                value={category.status}
              >
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
              <button
                className="rounded bg-blue-500 px-3 py-2 text-sm font-semibold hover:bg-blue-600 disabled:bg-gray-700"
                disabled={saving === `category-${category.categoryKey}`}
                onClick={() => saveCategory(category)}
                type="button"
              >
                Save category
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h3 className="text-lg font-semibold">App policies and quotas</h3>
        <div className="mt-3 space-y-4">
          {overview.appPolicies.map((policy) => (
            <div
              className="rounded border border-gray-800 bg-gray-950 p-4"
              key={policy.dappId}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{policy.dappName}</p>
                  <p className="text-xs text-gray-500">
                    App ID {policy.dappId}
                    {policy.dappUid ? ` · UID ${policy.dappUid}` : ''} · Policy
                    v{policy.policyVersion}
                  </p>
                </div>
                <button
                  className="rounded bg-blue-500 px-3 py-2 text-sm font-semibold hover:bg-blue-600 disabled:bg-gray-700"
                  disabled={saving === `policy-${policy.dappId}`}
                  onClick={() => savePolicy(policy)}
                  type="button"
                >
                  Save policy
                </button>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-4">
                <label className="text-sm text-gray-300">
                  Status
                  <select
                    className="mt-1 w-full rounded bg-gray-800 p-2 text-white"
                    onChange={(event) =>
                      updatePolicy(policy.dappId, {
                        status: event.target.value as PolicyStatus,
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
                  Minute cap
                  <input
                    className="mt-1 w-full rounded bg-gray-800 p-2 text-white"
                    min={0}
                    onChange={(event) =>
                      updatePolicy(policy.dappId, {
                        minuteLimit: Number(event.target.value),
                      })
                    }
                    type="number"
                    value={policy.minuteLimit}
                  />
                </label>
                <label className="text-sm text-gray-300">
                  Daily cap
                  <input
                    className="mt-1 w-full rounded bg-gray-800 p-2 text-white"
                    min={0}
                    onChange={(event) =>
                      updatePolicy(policy.dappId, {
                        dailyLimit: Number(event.target.value),
                      })
                    }
                    type="number"
                    value={policy.dailyLimit}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    checked={policy.sandboxMode}
                    onChange={() =>
                      updatePolicy(policy.dappId, {
                        sandboxMode: !policy.sandboxMode,
                      })
                    }
                    type="checkbox"
                  />
                  Sandbox mode
                </label>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-300">
                    Categories
                  </p>
                  <div className="space-y-2">
                    {CATEGORIES.map((category) => (
                      <label
                        className="flex items-center gap-2 text-sm text-gray-300"
                        key={category}
                      >
                        <input
                          checked={policy.allowedCategories.includes(category)}
                          onChange={() =>
                            updatePolicy(policy.dappId, {
                              allowedCategories: toggleValue(
                                policy.allowedCategories,
                                category
                              ),
                            })
                          }
                          type="checkbox"
                        />
                        {category}
                      </label>
                    ))}
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        checked={policy.securityCategoryEnabled}
                        onChange={() =>
                          updatePolicy(policy.dappId, {
                            securityCategoryEnabled:
                              !policy.securityCategoryEnabled,
                          })
                        }
                        type="checkbox"
                      />
                      Explicitly allow SECURITY
                    </label>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-300">
                    Priorities
                  </p>
                  <div className="space-y-2">
                    {PRIORITIES.map((priority) => (
                      <label
                        className="flex items-center gap-2 text-sm text-gray-300"
                        key={priority}
                      >
                        <input
                          checked={policy.allowedPriorities.includes(priority)}
                          onChange={() =>
                            updatePolicy(policy.dappId, {
                              allowedPriorities: toggleValue(
                                policy.allowedPriorities,
                                priority
                              ),
                            })
                          }
                          type="checkbox"
                        />
                        {priority}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-300">
                    Providers
                  </p>
                  <div className="space-y-2">
                    {PROVIDERS.map((provider) => (
                      <label
                        className="flex items-center gap-2 text-sm text-gray-300"
                        key={provider}
                      >
                        <input
                          checked={policy.allowedProviders.includes(provider)}
                          onChange={() =>
                            updatePolicy(policy.dappId, {
                              allowedProviders: toggleValue(
                                policy.allowedProviders,
                                provider
                              ),
                            })
                          }
                          type="checkbox"
                        />
                        {provider}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h3 className="text-lg font-semibold">Recent events</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">App</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Channel</th>
                <th className="px-3 py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {overview.recentEvents.map((event) => (
                <tr className="border-t border-gray-800" key={event.eventId}>
                  <td className="px-3 py-2 text-gray-300">
                    {formatDate(event.createdAt)}
                  </td>
                  <td className="px-3 py-2 text-gray-300">{event.dappId}</td>
                  <td className="px-3 py-2 text-gray-300">
                    {event.categoryKey}
                  </td>
                  <td className="px-3 py-2 text-gray-300">{event.status}</td>
                  <td className="px-3 py-2 text-gray-300">
                    {event.selectedChannelType ?? 'N/A'}
                  </td>
                  <td className="px-3 py-2 text-gray-300">
                    {event.deniedReason ?? 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
