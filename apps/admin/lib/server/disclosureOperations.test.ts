import { buildDisclosureOpsOverview } from './disclosureOperations';

describe('Disclosure operations helpers', () => {
  it('builds aggregate disclosure health without exposing raw identifiers', () => {
    const overview = buildDisclosureOpsOverview({
      activeSubjectCount: 2,
      dappSummaries: [
        {
          active_grant_count: '1',
          active_subject_count: 1,
          app_name: 'FundLoop',
          dapp_id: 42,
          last_granted_at: '2026-05-03T10:00:00.000Z',
          last_revoked_at: null,
          revoked_grant_count: 0,
          sources: { allow_page: '1' },
        },
      ],
      events: [
        {
          actor_identifier: 'user@example.com',
          actor_type: 'user',
          created_at: '2026-05-03T12:00:00.000Z',
          details: {
            app_scoped_subject_id: 'subject_internal',
            disclosure_grant_id: 'grant_internal',
            dapp_user_uuid: 'dapp_user_internal',
            safe: 'visible',
          },
          event_type: 'disclosure.revoked',
          outcome: 'success',
          request_id: 'passport_request_1',
        },
      ],
      generatedAt: '2026-05-03T13:00:00.000Z',
      grantTotals: [
        {
          grant_count: '1',
          source: 'allow_page',
          status: 'active',
        },
        {
          grant_count: 1,
          source: 'oidc',
          status: 'revoked',
        },
      ],
      oidcClientSummaries: [
        {
          active_grant_count: 0,
          client_id: 'client_tcoin',
          client_name: 'TCOIN',
          last_granted_at: '2026-05-03T11:00:00.000Z',
          last_revoked_at: '2026-05-03T12:00:00.000Z',
          revoked_grant_count: '1',
          sources: { oidc: 1 },
        },
      ],
      recentEventCount: 234,
      recentGrants: [
        {
          app_scoped_subject_id: 'subject_1',
          consent_version: 1,
          created_at: '2026-05-03T10:00:00.000Z',
          dapp_id: 42,
          granted_at: '2026-05-03T10:00:00.000Z',
          granted_claims: [{ claim: 'stamp.email' }],
          granted_scopes: ['cubid:stamps'],
          id: 'grant_1',
          metadata: {},
          oidc_client_id: null,
          policy_version: 'allow-page-v1',
          revoked_at: null,
          revoked_by: null,
          source: 'allow_page',
          status: 'active',
          updated_at: '2026-05-03T10:00:00.000Z',
        },
        {
          app_scoped_subject_id: 'subject_2',
          consent_version: 2,
          created_at: '2026-05-03T11:00:00.000Z',
          dapp_id: null,
          granted_at: '2026-05-03T11:00:00.000Z',
          granted_claims: [{ claim: 'email' }, { claim: 'profile' }],
          granted_scopes: ['openid', 'email', 'profile'],
          id: 'grant_2',
          metadata: {},
          oidc_client_id: 'client_tcoin',
          policy_version: 'oidc-v1',
          revoked_at: '2026-05-03T12:00:00.000Z',
          revoked_by: 'user',
          source: 'oidc',
          status: 'revoked',
          updated_at: '2026-05-03T12:00:00.000Z',
        },
      ],
    });

    expect(overview.totals).toMatchObject({
      activeGrants: 1,
      activeSubjects: 2,
      recentGrantEvents7d: 234,
      recentGrantSamples: 2,
      revokedGrants: 1,
    });
    expect(overview.totals.grantsBySource).toEqual({
      allow_page: 1,
      oidc: 1,
    });
    expect(overview.dapps[0]).toMatchObject({
      activeGrantCount: 1,
      activeSubjectCount: 1,
      appName: 'FundLoop',
      dappId: 42,
    });
    expect(overview.oidcClients[0]).toMatchObject({
      activeGrantCount: 0,
      clientId: 'client_tcoin',
      clientName: 'TCOIN',
      revokedGrantCount: 1,
    });
    expect(overview.recentEvents[0].details).toEqual({
      app_scoped_subject_id: '[redacted]',
      dapp_user_uuid: '[redacted]',
      disclosure_grant_id: '[redacted]',
      safe: 'visible',
    });
    expect('actorIdentifier' in overview.recentEvents[0]).toBe(false);
  });
});
