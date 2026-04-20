import {
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
});
