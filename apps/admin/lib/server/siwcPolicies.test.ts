import {
  listSiwcPolicies,
  normalizeSiwcPolicyInput,
  upsertSiwcPolicy,
} from './siwcPolicies';

const createListSupabase = () => ({
  from: jest.fn((table: string) => {
    if (table === 'dapps') {
      return {
        select: () => ({
          order: async () => ({
            data: [
              { appname: 'Demo App', id: 42, uid: 'app_uid_42' },
              { appname: 'No Policy App', id: 43, uid: 'app_uid_43' },
            ],
            error: null,
          }),
        }),
      };
    }

    if (table === 'siwc_signing_policies') {
      return {
        select: () => ({
          in: async () => ({
            data: [
              {
                allowed_chains: ['evm', 'sui'],
                allowed_request_types: ['message'],
                contract_allowlist: ['0xabc'],
                created_at: '2026-05-05T00:00:00.000Z',
                custody_enabled: true,
                dapp_id: 42,
                id: 'policy_42',
                metadata: { note: 'safe' },
                policy_name: 'Demo SIWC policy',
                policy_version: 2,
                required_acr: 'urn:cubid:acr:passkey',
                sandbox_mode: true,
                signing_enabled: true,
                status: 'enabled',
                transaction_value_limit_usd: '50.00',
                updated_at: '2026-05-05T01:00:00.000Z',
                webhook_event_subscriptions: ['wallet.signature.completed'],
              },
            ],
            error: null,
          }),
        }),
      };
    }

    throw new Error(`Unexpected table ${table}`);
  }),
});

const createUpsertSupabase = (existingPolicyVersion?: number) => {
  const eventInsert = jest.fn(async () => ({ error: null }));
  const policyResult = {
    select: () => ({
      maybeSingle: async () => ({
        data: {
          allowed_chains: ['evm'],
          allowed_request_types: ['message'],
          contract_allowlist: [],
          created_at: '2026-05-05T00:00:00.000Z',
          custody_enabled: true,
          dapp_id: 42,
          id: 'policy_42',
          metadata: {},
          policy_name: 'Production signing',
          policy_version: existingPolicyVersion ? existingPolicyVersion + 1 : 1,
          required_acr: 'urn:cubid:acr:passkey',
          sandbox_mode: true,
          signing_enabled: true,
          status: 'enabled',
          transaction_value_limit_usd: null,
          updated_at: '2026-05-05T01:00:00.000Z',
          webhook_event_subscriptions: [],
        },
        error: null,
      }),
    }),
  };
  const policyWrite = jest.fn((_payload?: unknown) => policyResult);

  return {
    eventInsert,
    policyWrite,
    supabase: {
      from: jest.fn((table: string) => {
        if (table === 'dapps') {
          return {
            select: () => ({
              match: () => ({
                maybeSingle: async () => ({
                  data: { appname: 'Demo App', id: 42, uid: 'app_uid_42' },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'siwc_signing_policies') {
          return {
            insert: policyWrite,
            select: () => ({
              match: () => ({
                maybeSingle: async () => ({
                  data: existingPolicyVersion
                    ? {
                        policy_version: existingPolicyVersion,
                      }
                    : null,
                  error: null,
                }),
              }),
            }),
            update: (payload: unknown) => {
              policyWrite(payload);
              return {
                match: () => policyResult,
              };
            },
          };
        }

        if (table === 'api_security_events') {
          return {
            insert: eventInsert,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    },
  };
};

describe('SIWC policy helpers', () => {
  it('lists saved policies and fail-closed defaults for dapps without policies', async () => {
    const overview = await listSiwcPolicies(createListSupabase() as never);

    expect(overview.policies[0]).toMatchObject({
      allowedChains: ['evm', 'sui'],
      allowedRequestTypes: ['message'],
      custodyEnabled: true,
      dappId: 42,
      dappName: 'Demo App',
      policyVersion: 2,
      requiredAcr: 'urn:cubid:acr:passkey',
      signingEnabled: true,
      status: 'enabled',
      transactionValueLimitUsd: 50,
    });
    expect(overview.policies[1]).toMatchObject({
      allowedChains: [],
      allowedRequestTypes: [],
      custodyEnabled: false,
      dappId: 43,
      policyVersion: 0,
      sandboxMode: true,
      signingEnabled: false,
      status: 'disabled',
    });
  });

  it('creates a passkey-required signing policy and writes an audit event', async () => {
    const { eventInsert, policyWrite, supabase } = createUpsertSupabase();
    const policy = await upsertSiwcPolicy(
      {
        adminUser: { email: 'admin@example.com', uid: 'admin_uid' },
        email: 'admin@example.com',
        requestId: 'admin_request_siwc',
        supabase,
        token: { uid: 'firebase_uid' },
      } as never,
      {
        allowedChains: ['evm'],
        allowedRequestTypes: ['message'],
        custodyEnabled: true,
        dappId: 42,
        policyName: 'Production signing',
        requiredAcr: 'urn:cubid:acr:passkey',
        sandboxMode: true,
        signingEnabled: true,
        status: 'enabled',
      }
    );

    expect(policy).toMatchObject({
      dappId: 42,
      policyVersion: 1,
      requiredAcr: 'urn:cubid:acr:passkey',
      signingEnabled: true,
    });
    expect(policyWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        policy_version: 1,
        required_acr: 'urn:cubid:acr:passkey',
      })
    );
    expect(eventInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'siwc_policy.created',
        request_id: 'admin_request_siwc',
      })
    );
  });

  it('increments the policy version when updating an existing policy', async () => {
    const { policyWrite, supabase } = createUpsertSupabase(3);
    const policy = await upsertSiwcPolicy(
      {
        adminUser: { email: 'admin@example.com', uid: 'admin_uid' },
        email: 'admin@example.com',
        requestId: 'admin_request_siwc',
        supabase,
        token: { uid: 'firebase_uid' },
      } as never,
      {
        allowedChains: ['evm'],
        allowedRequestTypes: ['message'],
        custodyEnabled: true,
        dappId: 42,
        policyName: 'Production signing',
        requiredAcr: 'urn:cubid:acr:passkey',
        sandboxMode: true,
        signingEnabled: true,
        status: 'enabled',
      }
    );

    expect(policy.policyVersion).toBe(4);
    expect(policyWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        policy_version: 4,
      })
    );
  });

  it('rejects unsupported chains and request types', () => {
    expect(() =>
      normalizeSiwcPolicyInput({
        allowedChains: ['cardano' as never],
        allowedRequestTypes: ['message'],
        custodyEnabled: true,
        dappId: 42,
        policyName: 'Bad policy',
        requiredAcr: 'urn:cubid:acr:passkey',
        sandboxMode: true,
        signingEnabled: true,
        status: 'enabled',
      })
    ).toThrow(/allowedChains/);

    expect(() =>
      normalizeSiwcPolicyInput({
        allowedChains: ['evm'],
        allowedRequestTypes: ['raw' as never],
        custodyEnabled: true,
        dappId: 42,
        policyName: 'Bad policy',
        requiredAcr: 'urn:cubid:acr:passkey',
        sandboxMode: true,
        signingEnabled: true,
        status: 'enabled',
      })
    ).toThrow(/allowedRequestTypes/);
  });

  it('fails closed when signing is enabled without passkey ACR', () => {
    expect(() =>
      normalizeSiwcPolicyInput({
        allowedChains: ['evm'],
        allowedRequestTypes: ['message'],
        custodyEnabled: true,
        dappId: 42,
        policyName: 'Bad policy',
        requiredAcr: null,
        sandboxMode: true,
        signingEnabled: true,
        status: 'enabled',
      })
    ).toThrow(/passkey ACR/);
  });
});
