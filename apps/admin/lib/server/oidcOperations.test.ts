import {
  normalizeClientOpsUpdateInput,
} from './oidcOperations';

describe('OIDC operations helpers', () => {
  it('accepts suspend and rate-limit tier updates', () => {
    expect(
      normalizeClientOpsUpdateInput({
        clientId: 'client_123',
        status: 'suspended',
        rateLimitTier: 'trusted',
      }),
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
      }),
    ).toThrow(/active or suspended/);
  });

  it('requires at least one editable field', () => {
    expect(() =>
      normalizeClientOpsUpdateInput({
        clientId: 'client_123',
      }),
    ).toThrow(/status or rateLimitTier/);
  });
});
