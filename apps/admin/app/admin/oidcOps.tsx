'use client';

import dayjs from 'dayjs';
import useAuth from 'hooks/useAuth';
import { authedPost } from 'lib/api';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import type {
  OidcOpsAuditEvent,
  OidcOpsClientSummary,
  OidcOpsOverviewPayload,
} from './shared';

type RateLimitTier = 'starter' | 'trusted' | 'internal';

const RATE_LIMIT_TIERS: RateLimitTier[] = ['starter', 'trusted', 'internal'];

const formatList = (values: readonly string[]) => {
  if (values.length === 0) {
    return 'None';
  }

  return values.join(', ');
};

const formatDate = (value: string | null) => {
  if (!value) {
    return 'Never';
  }

  return dayjs(value).format('YYYY-MM-DD HH:mm');
};

const MetricCard = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg border border-gray-800 bg-gray-900/70 px-3 py-2">
    <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
    <p className="mt-1 text-lg font-semibold text-white">{value}</p>
  </div>
);

const AuditEventList = ({ events }: { events: OidcOpsAuditEvent[] }) => {
  if (events.length === 0) {
    return <p className="text-sm text-gray-500">No recent audit events.</p>;
  }

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <div
          key={`${event.eventType}-${event.createdAt}-${event.requestId ?? 'no-request'}`}
          className="rounded-lg border border-gray-800 bg-gray-950/40 p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-white">{event.eventType}</p>
            <span
              className={`rounded-full px-2 py-1 text-[11px] uppercase tracking-wide ${
                event.outcome === 'success'
                  ? 'bg-emerald-500/10 text-emerald-300'
                  : 'bg-amber-500/10 text-amber-300'
              }`}
            >
              {event.outcome}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {formatDate(event.createdAt)} · {event.actorType}
          </p>
        </div>
      ))}
    </div>
  );
};

const ClientOpsCard = ({
  client,
  onUpdate,
  updatingClientId,
}: {
  client: OidcOpsClientSummary;
  onUpdate: (
    clientId: string,
    patch: { rateLimitTier?: RateLimitTier; status?: 'active' | 'suspended' },
  ) => Promise<void>;
  updatingClientId: string | null;
}) => {
  const isUpdating = updatingClientId === client.clientId;
  const canSuspend = client.status === 'active';
  const canReactivate = client.status === 'suspended';

  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900/70 p-5 shadow-lg">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-white">{client.clientName}</h2>
            <span className="rounded-full bg-gray-800 px-2 py-1 text-xs text-gray-300">
              {client.clientType}
            </span>
            <span
              className={`rounded-full px-2 py-1 text-xs ${
                client.status === 'active'
                  ? 'bg-emerald-500/10 text-emerald-300'
                  : client.status === 'suspended'
                    ? 'bg-amber-500/10 text-amber-300'
                    : 'bg-red-500/10 text-red-300'
              }`}
            >
              {client.status}
            </span>
          </div>
          <p className="mt-1 break-all text-xs text-gray-500">{client.clientId}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
            disabled={isUpdating || client.status === 'revoked'}
            value={client.rateLimitTier}
            onChange={(event) =>
              onUpdate(client.clientId, { rateLimitTier: event.target.value as RateLimitTier })
            }
          >
            {RATE_LIMIT_TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
          {canSuspend && (
            <button
              className="rounded-md border border-amber-500/60 px-3 py-2 text-sm font-medium text-amber-200 disabled:opacity-50"
              disabled={isUpdating}
              onClick={() => onUpdate(client.clientId, { status: 'suspended' })}
            >
              Suspend
            </button>
          )}
          {canReactivate && (
            <button
              className="rounded-md border border-emerald-500/60 px-3 py-2 text-sm font-medium text-emerald-200 disabled:opacity-50"
              disabled={isUpdating}
              onClick={() => onUpdate(client.clientId, { status: 'active' })}
            >
              Reactivate
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Active consents" value={client.activeConsentCount} />
        <MetricCard label="Active tokens" value={client.activeTokenCount} />
        <MetricCard label="Token success" value={client.metrics7d.tokenSuccesses} />
        <MetricCard label="Token failures" value={client.metrics7d.tokenFailures} />
        <MetricCard label="Userinfo success" value={client.metrics7d.userinfoSuccesses} />
        <MetricCard label="Userinfo failures" value={client.metrics7d.userinfoFailures} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 text-sm text-gray-300">
          <p>
            <span className="text-gray-500">Auth method:</span>{' '}
            {client.tokenEndpointAuthMethod}
          </p>
          <p>
            <span className="text-gray-500">Verification:</span>{' '}
            {client.verificationStatus}
          </p>
          <p>
            <span className="text-gray-500">Grant types:</span>{' '}
            {formatList(client.grantTypes)}
          </p>
          <p>
            <span className="text-gray-500">Default scopes:</span>{' '}
            {formatList(client.defaultScopes)}
          </p>
          <p>
            <span className="text-gray-500">Allowed scopes:</span>{' '}
            {formatList(client.allowedScopes)}
          </p>
          <p>
            <span className="text-gray-500">Created:</span> {formatDate(client.createdAt)}
          </p>
          <p>
            <span className="text-gray-500">Updated:</span> {formatDate(client.updatedAt)}
          </p>
          <p>
            <span className="text-gray-500">Suspended:</span>{' '}
            {formatDate(client.suspendedAt)}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Redirect URIs
            </h3>
            <ul className="mt-2 space-y-1 text-xs text-gray-300">
              {client.redirectUris.map((uri) => (
                <li key={uri} className="break-all rounded bg-gray-950/50 px-2 py-1">
                  {uri}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Post-logout Redirect URIs
            </h3>
            <ul className="mt-2 space-y-1 text-xs text-gray-300">
              {client.postLogoutRedirectUris.length === 0 && (
                <li className="text-gray-500">None</li>
              )}
              {client.postLogoutRedirectUris.map((uri) => (
                <li key={uri} className="break-all rounded bg-gray-950/50 px-2 py-1">
                  {uri}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Claim policy bindings
          </h3>
          <div className="mt-2 space-y-2">
            {client.bindings.length === 0 && (
              <p className="text-sm text-gray-500">No active bindings.</p>
            )}
            {client.bindings.map((binding) => (
              <div
                key={`${binding.claimName}-${binding.policyId ?? 'direct'}`}
                className="rounded-lg border border-gray-800 bg-gray-950/40 p-3 text-sm"
              >
                <p className="font-medium text-white">{binding.claimName}</p>
                <p className="text-xs text-gray-500">
                  {binding.policyName ?? 'Direct claim release'} ·{' '}
                  {binding.enabled ? 'enabled' : 'disabled'}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Recent audit events
          </h3>
          <div className="mt-2">
            <AuditEventList events={client.recentAuditEvents} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default function OidcOps() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState<OidcOpsOverviewPayload | null>(null);
  const [updatingClientId, setUpdatingClientId] = useState<string | null>(null);

  const loadOverview = async (showRefreshingState = false) => {
    if (showRefreshingState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await authedPost<{ data: OidcOpsOverviewPayload }>(
        '/api/admin/oidc/operations/overview',
        {},
      );
      setOverview(response.data.data);
    } catch {
      toast.error('Failed to load OIDC operations overview');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.email) {
      loadOverview();
    }
  }, [user?.email]);

  const updateClient = async (
    clientId: string,
    patch: { rateLimitTier?: RateLimitTier; status?: 'active' | 'suspended' },
  ) => {
    const statusAction = patch.status === 'suspended' ? 'suspend' : 'reactivate';
    if (patch.status && !window.confirm(`Are you sure you want to ${statusAction} this OIDC client?`)) {
      return;
    }

    setUpdatingClientId(clientId);
    try {
      await authedPost('/api/admin/oidc/clients/update-ops', {
        clientId,
        ...patch,
      });
      toast.success('OIDC client updated');
      await loadOverview(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update OIDC client');
    } finally {
      setUpdatingClientId(null);
    }
  };

  if (loading) {
    return <div className="p-3 text-sm text-gray-400">Loading OIDC operations...</div>;
  }

  if (!overview) {
    return <div className="p-3 text-sm text-gray-400">OIDC operations data is unavailable.</div>;
  }

  return (
    <div className="space-y-6 p-3">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">OIDC Operations</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-400">
            Monitor relying-party clients, token/userinfo activity, consent counts, and
            operational controls without exposing secrets or raw subject identifiers.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Generated {formatDate(overview.generatedAt)}
          </p>
        </div>
        <button
          className="rounded-md border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition hover:border-gray-500 hover:text-white disabled:opacity-50"
          disabled={refreshing}
          onClick={() => loadOverview(true)}
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="space-y-5">
        {overview.clients.length === 0 && (
          <p className="rounded-xl border border-gray-800 bg-gray-900/70 p-5 text-sm text-gray-400">
            No OIDC clients registered yet.
          </p>
        )}
        {overview.clients.map((client) => (
          <ClientOpsCard
            key={client.clientId}
            client={client}
            onUpdate={updateClient}
            updatingClientId={updatingClientId}
          />
        ))}
      </div>

      <section className="rounded-xl border border-gray-800 bg-gray-900/70 p-5">
        <h2 className="text-lg font-semibold text-white">Recent issuer audit events</h2>
        <div className="mt-4">
          <AuditEventList events={overview.recentAuditEvents} />
        </div>
      </section>
    </div>
  );
}
