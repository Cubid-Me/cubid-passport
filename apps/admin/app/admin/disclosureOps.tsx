'use client';

import dayjs from 'dayjs';
import useAuth from 'hooks/useAuth';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import type {
  DisclosureOpsDappSummary,
  DisclosureOpsEvent,
  DisclosureOpsGrantSample,
  DisclosureOpsOidcClientSummary,
  DisclosureOpsOverviewPayload,
} from './shared';
import { loadDisclosureOpsOverview } from '../../features/disclosure-ops/api';

const formatDate = (value: string | null) => {
  if (!value) {
    return 'Never';
  }

  return dayjs(value).format('YYYY-MM-DD HH:mm');
};

const formatSources = (sources: Record<string, number>) => {
  const entries = Object.entries(sources);
  if (entries.length === 0) {
    return 'None';
  }

  return entries.map(([source, count]) => `${source}: ${count}`).join(', ');
};

const MetricCard = ({ label, value }: { label: string; value: number }) => (
  <div className='rounded-lg border border-gray-800 bg-gray-900/70 px-3 py-2'>
    <p className='text-[11px] uppercase tracking-wide text-gray-500'>{label}</p>
    <p className='mt-1 text-lg font-semibold text-white'>{value}</p>
  </div>
);

const GrantSamples = ({ grants }: { grants: DisclosureOpsGrantSample[] }) => {
  if (grants.length === 0) {
    return <p className='text-sm text-gray-500'>No recent grants.</p>;
  }

  return (
    <div className='space-y-2'>
      {grants.map((grant) => (
        <div
          className='rounded-lg border border-gray-800 bg-gray-950/40 p-3 text-xs text-gray-300'
          key={`${grant.source}-${grant.grantedAt}-${grant.policyVersion}`}
        >
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <p className='font-medium text-white'>{grant.source}</p>
            <span
              className={`rounded-full px-2 py-1 uppercase tracking-wide ${
                grant.status === 'active'
                  ? 'bg-emerald-500/10 text-emerald-300'
                  : 'bg-amber-500/10 text-amber-300'
              }`}
            >
              {grant.status}
            </span>
          </div>
          <p className='mt-1 text-gray-500'>
            {grant.scopeCount} scopes · {grant.claimCount} claims · policy{' '}
            {grant.policyVersion} · consent v{grant.consentVersion}
          </p>
          <p className='mt-1 text-gray-500'>
            Granted {formatDate(grant.grantedAt)}
            {grant.revokedAt ? ` · revoked ${formatDate(grant.revokedAt)}` : ''}
          </p>
        </div>
      ))}
    </div>
  );
};

const DisclosureEventList = ({ events }: { events: DisclosureOpsEvent[] }) => {
  if (events.length === 0) {
    return <p className='text-sm text-gray-500'>No recent grant events.</p>;
  }

  return (
    <div className='space-y-2'>
      {events.map((event) => (
        <div
          className='rounded-lg border border-gray-800 bg-gray-950/40 p-3'
          key={`${event.eventType}-${event.createdAt}-${
            event.requestId ?? 'no-request'
          }`}
        >
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <p className='text-sm font-medium text-white'>{event.eventType}</p>
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
          <p className='mt-1 text-xs text-gray-500'>
            {formatDate(event.createdAt)} · {event.actorType}
            {event.requestId ? ` · ${event.requestId}` : ''}
          </p>
        </div>
      ))}
    </div>
  );
};

const DappCard = ({ dapp }: { dapp: DisclosureOpsDappSummary }) => (
  <section className='rounded-xl border border-gray-800 bg-gray-900/70 p-5 shadow-lg'>
    <div className='flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between'>
      <div>
        <h2 className='text-lg font-semibold text-white'>{dapp.appName}</h2>
        <p className='mt-1 text-xs text-gray-500'>Dapp {dapp.dappId}</p>
      </div>
      <p className='rounded-lg border border-gray-800 bg-gray-950/50 px-3 py-2 text-xs text-gray-300'>
        {formatSources(dapp.sources)}
      </p>
    </div>
    <div className='mt-4 grid gap-3 sm:grid-cols-4'>
      <MetricCard label='Active grants' value={dapp.activeGrantCount} />
      <MetricCard label='Revoked grants' value={dapp.revokedGrantCount} />
      <MetricCard label='Active subjects' value={dapp.activeSubjectCount} />
      <MetricCard
        label='Recent grants'
        value={dapp.recentGrants.length}
      />
    </div>
    <div className='mt-4 grid gap-4 lg:grid-cols-2'>
      <div className='space-y-2 text-sm text-gray-300'>
        <p>
          <span className='text-gray-500'>Last grant:</span>{' '}
          {formatDate(dapp.lastGrantedAt)}
        </p>
        <p>
          <span className='text-gray-500'>Last revoke:</span>{' '}
          {formatDate(dapp.lastRevokedAt)}
        </p>
      </div>
      <GrantSamples grants={dapp.recentGrants} />
    </div>
  </section>
);

const OidcClientCard = ({
  client,
}: {
  client: DisclosureOpsOidcClientSummary;
}) => (
  <section className='rounded-xl border border-gray-800 bg-gray-900/70 p-5 shadow-lg'>
    <div className='flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between'>
      <div>
        <h2 className='text-lg font-semibold text-white'>{client.clientName}</h2>
        <p className='mt-1 break-all text-xs text-gray-500'>
          {client.clientId}
        </p>
      </div>
      <p className='rounded-lg border border-gray-800 bg-gray-950/50 px-3 py-2 text-xs text-gray-300'>
        {formatSources(client.sources)}
      </p>
    </div>
    <div className='mt-4 grid gap-3 sm:grid-cols-3'>
      <MetricCard label='Active grants' value={client.activeGrantCount} />
      <MetricCard label='Revoked grants' value={client.revokedGrantCount} />
      <MetricCard
        label='Recent grants'
        value={client.recentGrants.length}
      />
    </div>
    <div className='mt-4 grid gap-4 lg:grid-cols-2'>
      <div className='space-y-2 text-sm text-gray-300'>
        <p>
          <span className='text-gray-500'>Last grant:</span>{' '}
          {formatDate(client.lastGrantedAt)}
        </p>
        <p>
          <span className='text-gray-500'>Last revoke:</span>{' '}
          {formatDate(client.lastRevokedAt)}
        </p>
      </div>
      <GrantSamples grants={client.recentGrants} />
    </div>
  </section>
);

export default function DisclosureOps() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<DisclosureOpsOverviewPayload | null>(
    null
  );
  const [refreshing, setRefreshing] = useState(false);

  const loadOverview = async (showRefreshingState = false) => {
    if (showRefreshingState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setOverview(await loadDisclosureOpsOverview());
    } catch {
      toast.error('Failed to load disclosure operations overview');
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

  if (loading) {
    return (
      <div className='p-3 text-sm text-gray-400'>
        Loading disclosure operations...
      </div>
    );
  }

  if (!overview) {
    return (
      <div className='p-3 text-sm text-gray-400'>
        Disclosure operations data is unavailable.
      </div>
    );
  }

  return (
    <div className='space-y-6 p-3'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
        <div>
          <h1 className='text-2xl font-semibold text-white'>
            Disclosure Operations
          </h1>
          <p className='mt-2 max-w-3xl text-sm text-gray-400'>
            Read-only visibility into app-scoped disclosure grants, sources,
            revocations, and recent grant events without exposing raw subject
            identifiers or secret material.
          </p>
          <p className='mt-1 text-xs text-gray-500'>
            Generated {formatDate(overview.generatedAt)}
          </p>
        </div>
        <button
          className='rounded-md border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition hover:border-gray-500 hover:text-white disabled:opacity-50'
          disabled={refreshing}
          onClick={() => loadOverview(true)}
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <section className='rounded-xl border border-gray-800 bg-gray-900/70 p-5 shadow-lg'>
        <h2 className='text-lg font-semibold text-white'>Grant health</h2>
        <div className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5'>
          <MetricCard label='Active grants' value={overview.totals.activeGrants} />
          <MetricCard
            label='Revoked grants'
            value={overview.totals.revokedGrants}
          />
          <MetricCard
            label='Active subjects'
            value={overview.totals.activeSubjects}
          />
          <MetricCard
            label='Grant events 7d'
            value={overview.totals.recentGrantEvents7d}
          />
          <MetricCard
            label='Grant samples'
            value={overview.totals.recentGrantSamples}
          />
        </div>
        <p className='mt-3 text-xs text-gray-500'>
          Sources: {formatSources(overview.totals.grantsBySource)} · Statuses:{' '}
          {formatSources(overview.totals.grantsByStatus)}
        </p>
      </section>

      <section className='space-y-4'>
        <h2 className='text-lg font-semibold text-white'>Dapp disclosure health</h2>
        {overview.dapps.length === 0 && (
          <p className='rounded-xl border border-gray-800 bg-gray-900/70 p-5 text-sm text-gray-400'>
            No dapp disclosure grants found.
          </p>
        )}
        {overview.dapps.map((dapp) => (
          <DappCard key={dapp.dappId} dapp={dapp} />
        ))}
      </section>

      <section className='space-y-4'>
        <h2 className='text-lg font-semibold text-white'>
          OIDC disclosure health
        </h2>
        {overview.oidcClients.length === 0 && (
          <p className='rounded-xl border border-gray-800 bg-gray-900/70 p-5 text-sm text-gray-400'>
            No OIDC disclosure grants found.
          </p>
        )}
        {overview.oidcClients.map((client) => (
          <OidcClientCard key={client.clientId} client={client} />
        ))}
      </section>

      <section className='rounded-xl border border-gray-800 bg-gray-900/70 p-5'>
        <h2 className='text-lg font-semibold text-white'>
          Recent disclosure events
        </h2>
        <div className='mt-4'>
          <DisclosureEventList events={overview.recentEvents} />
        </div>
      </section>
    </div>
  );
}
