import {
  buildPasskeyOpsSummary,
  normalizeClientCountRows,
  normalizeClientMetricRows,
  normalizeClientOpsUpdateInput,
} from './oidcOperations';

describe('OIDC operations helpers', () => {
  it('accepts suspend and rate-limit tier updates', () => {
    expect(
      normalizeClientOpsUpdateInput({
        clientId: 'client_123',
        status: 'suspended',
        rateLimitTier: 'trusted',
      })
    ).toEqual({
      clientId: 'client_123',
      status: 'suspended',
      rateLimitTier: 'trusted',
    });
  });

  it('rejects revoked status updates in Ops v1', () => {
    expect(() =>
      normalizeClientOpsUpdateInput({
        clientId: 'client_123',
        status: 'revoked',
      })
    ).toThrow(/active or suspended/);
  });

  it('requires at least one editable field', () => {
    expect(() =>
      normalizeClientOpsUpdateInput({
        clientId: 'client_123',
      })
    ).toThrow(/status or rateLimitTier/);
  });

  it('normalizes aggregate count rows returned from Supabase RPCs', () => {
    const counts = normalizeClientCountRows([
      {
        active_consent_count: '2',
        active_token_count: 5,
        client_id: 'client_123',
      },
      {
        active_consent_count: null,
        active_token_count: 'not-a-count',
        client_id: 'client_456',
      },
    ]);

    expect(counts.get('client_123')).toEqual({
      activeConsentCount: 2,
      activeTokenCount: 5,
    });
    expect(counts.get('client_456')).toEqual({
      activeConsentCount: 0,
      activeTokenCount: 0,
    });
  });

  it('normalizes aggregate metric rows returned from Supabase RPCs', () => {
    const metrics = normalizeClientMetricRows([
      {
        client_id: 'client_123',
        token_failures: '1',
        token_successes: 7,
        userinfo_failures: null,
        userinfo_successes: '9',
      },
      {
        client_id: 'client_456',
        token_failures: 'not-a-count',
        token_successes: null,
        userinfo_failures: 2,
        userinfo_successes: 3,
      },
    ]);

    expect(metrics.get('client_123')).toEqual({
      tokenFailures: 1,
      tokenSuccesses: 7,
      userinfoFailures: 0,
      userinfoSuccesses: 9,
    });
    expect(metrics.get('client_456')).toEqual({
      tokenFailures: 0,
      tokenSuccesses: 0,
      userinfoFailures: 2,
      userinfoSuccesses: 3,
    });
  });

  it('builds redacted passkey ops metrics and ACR failure counts', () => {
    const summary = buildPasskeyOpsSummary(
      {
        activeCount: '3',
        revokedCount: 1,
      },
      [
        {
          actor_identifier: 'subject_should_not_surface',
          actor_type: 'user',
          client_id: 'client_123',
          created_at: '2026-04-21T00:00:00.000Z',
          details: {
            credential_id: 'raw_credential',
            human_subject_key: 'human_subject_key',
            safe: 'visible',
          },
          event_type: 'passkey.registration.completed',
          outcome: 'success',
          request_id: 'request_1',
        },
        {
          actor_identifier: 'subject_should_not_surface',
          actor_type: 'user',
          client_id: 'client_123',
          created_at: '2026-04-21T00:01:00.000Z',
          details: {},
          event_type: 'passkey.authentication.completed',
          outcome: 'success',
          request_id: 'request_2',
        },
        {
          actor_identifier: 'subject_should_not_surface',
          actor_type: 'user',
          client_id: 'client_123',
          created_at: '2026-04-21T00:02:00.000Z',
          details: {},
          event_type: 'passkey.device.revoked',
          outcome: 'success',
          request_id: 'request_3',
        },
      ],
      [
        {
          actor_identifier: 'subject_should_not_surface',
          actor_type: 'user',
          client_id: 'client_123',
          created_at: '2026-04-21T00:03:00.000Z',
          details: { reason: 'acr_not_satisfied' },
          event_type: 'login_challenge.completed',
          outcome: 'failure',
          request_id: 'request_4',
        },
      ]
    );

    expect(summary).toMatchObject({
      activeCount: 3,
      authenticationSuccesses7d: 1,
      registrations7d: 1,
      revokedCount: 1,
      revocations7d: 1,
      stepUpFailures7d: 1,
      supportedAcrValues: ['urn:cubid:acr:passkey'],
    });
    expect(summary.recentAuditEvents[0].details).toEqual({
      credential_id: '[redacted]',
      human_subject_key: '[redacted]',
      safe: 'visible',
    });
    expect('actorIdentifier' in summary.recentAuditEvents[0]).toBe(false);
  });
});
