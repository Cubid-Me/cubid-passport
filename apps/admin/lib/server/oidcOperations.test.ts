import {
  normalizeClientCountRows,
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
});
