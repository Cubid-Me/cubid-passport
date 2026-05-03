import type { NextApiRequest, NextApiResponse } from 'next';

import syncAdminUser from '../../pages/api/admin/auth/sync';
import metadata from '../../pages/api/admin/metadata';
import disclosureOpsOverviewRoute from '../../pages/api/admin/disclosures/operations/overview';
import updateOidcClientOpsRoute from '../../pages/api/admin/oidc/clients/update-ops';
import rotateKey from '../../pages/api/admin/apps/rotate-key';
import createWebhook from '../../pages/api/admin/webhooks/create';
import listWebhooks from '../../pages/api/admin/webhooks/list';
import rotateWebhookSecret from '../../pages/api/admin/webhooks/rotate-secret';

const prepareAdminApiRequestMock = jest.fn();
const ensureAdminUserRecordMock = jest.fn();
const getOwnedDappMock = jest.fn();
const getOwnedDappIdsMock = jest.fn();
const getPlatformUserByEmailMock = jest.fn();
const rotateDappApiKeyMock = jest.fn();
const updateOidcClientOpsMock = jest.fn();
const loadDisclosureOpsOverviewMock = jest.fn();
const normalizeClientOpsUpdateInputMock = jest.fn();
const encryptWebhookSigningSecretMock = jest.fn();

jest.mock('./adminApi', () => ({
  getOwnedDapp: (...args: unknown[]) => getOwnedDappMock(...args),
  getOwnedDappIds: (...args: unknown[]) => getOwnedDappIdsMock(...args),
  getPlatformUserByEmail: (...args: unknown[]) =>
    getPlatformUserByEmailMock(...args),
  prepareAdminApiRequest: (...args: unknown[]) =>
    prepareAdminApiRequestMock(...args),
  ensureAdminUserRecord: (...args: unknown[]) =>
    ensureAdminUserRecordMock(...args),
  sendBadRequest: jest.fn(),
  sendForbidden: jest.fn(),
  sendServerError: jest.fn(),
}));

jest.mock('./oidcOperations', () => ({
  isOidcOpsInputError: () => false,
  normalizeClientOpsUpdateInput: (...args: unknown[]) =>
    normalizeClientOpsUpdateInputMock(...args),
  updateOidcClientOps: (...args: unknown[]) => updateOidcClientOpsMock(...args),
}));

jest.mock('./disclosureOperations', () => ({
  loadDisclosureOpsOverview: (...args: unknown[]) =>
    loadDisclosureOpsOverviewMock(...args),
}));

jest.mock('./dappApiKeys', () => ({
  rotateDappApiKey: (...args: unknown[]) => rotateDappApiKeyMock(...args),
}));

jest.mock('./webhookSigningSecrets', () => ({
  encryptWebhookSigningSecret: (...args: unknown[]) =>
    encryptWebhookSigningSecretMock(...args),
  WEBHOOK_SIGNING_SECRET_LEGACY_SENTINEL:
    '__cubid_encrypted_webhook_signing_secret__',
}));

const createResponse = () => {
  const res = {
    json: jest.fn(() => res),
    setHeader: jest.fn(() => res),
    status: jest.fn(() => res),
  };

  return res as unknown as NextApiResponse;
};

describe('Admin route baseline wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the user actor and auth-sync rate limit for auth/sync', async () => {
    prepareAdminApiRequestMock.mockResolvedValue({
      body: {},
      context: { email: 'admin@example.com' },
      requestId: 'admin_request_1',
    });
    ensureAdminUserRecordMock.mockResolvedValue({ uid: 'admin_uid' });

    await syncAdminUser({} as NextApiRequest, createResponse());

    expect(prepareAdminApiRequestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        actor: 'user',
        rateLimitGroup: 'admin_auth_sync',
        route: 'admin/auth/sync',
      })
    );
  });

  it('uses the admin read policy for metadata', async () => {
    prepareAdminApiRequestMock.mockResolvedValue({
      body: {},
      context: {
        supabase: {
          from: () => ({
            select: async () => ({ data: [], error: null }),
          }),
        },
      },
      requestId: 'admin_request_2',
    });

    await metadata({} as NextApiRequest, createResponse());

    expect(prepareAdminApiRequestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        actor: 'admin',
        rateLimitGroup: 'admin_read',
        route: 'admin/metadata',
      })
    );
  });

  it('uses the sensitive policy for app key rotation', async () => {
    prepareAdminApiRequestMock.mockResolvedValue({
      body: { dappId: 42 },
      context: {
        adminUser: { uid: 'admin_uid' },
        supabase: {},
      },
      requestId: 'admin_request_3',
    });
    getOwnedDappMock.mockResolvedValue({ id: 42 });
    rotateDappApiKeyMock.mockResolvedValue({
      apiKey: 'cubid_live_prefix_secret',
      keyRecord: {
        key_prefix: 'prefix',
        last_used_at: null,
        rotated_at: '2026-04-27T00:00:00.000Z',
        status: 'active',
      },
    });

    const response = createResponse();
    await rotateKey({} as NextApiRequest, response);

    expect(prepareAdminApiRequestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        actor: 'admin',
        rateLimitGroup: 'admin_sensitive',
        route: 'admin/apps/rotate-key',
      })
    );
    expect(rotateDappApiKeyMock).toHaveBeenCalledWith({}, 42);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          apiKey: 'cubid_live_prefix_secret',
          apiKeyPrefix: 'prefix',
        }),
      })
    );
  });

  it('uses the sensitive policy for OIDC client ops updates', async () => {
    prepareAdminApiRequestMock.mockResolvedValue({
      body: { clientId: 'client_123', status: 'suspended' },
      context: { adminUser: { uid: 'admin_uid' } },
      requestId: 'admin_request_4',
    });
    normalizeClientOpsUpdateInputMock.mockReturnValue({
      clientId: 'client_123',
      status: 'suspended',
    });
    updateOidcClientOpsMock.mockResolvedValue({
      clientId: 'client_123',
      status: 'suspended',
    });

    await updateOidcClientOpsRoute({} as NextApiRequest, createResponse());

    expect(prepareAdminApiRequestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        actor: 'admin',
        rateLimitGroup: 'admin_sensitive',
        route: 'admin/oidc/clients/update-ops',
      })
    );
  });

  it('uses the admin read policy for disclosure operations overview', async () => {
    prepareAdminApiRequestMock.mockResolvedValue({
      body: {},
      context: { supabase: {} },
      requestId: 'admin_request_disclosure_ops',
    });
    loadDisclosureOpsOverviewMock.mockResolvedValue({
      dapps: [],
      generatedAt: '2026-05-03T00:00:00.000Z',
      oidcClients: [],
      recentEvents: [],
      totals: {
        activeGrants: 0,
        activeSubjects: 0,
        grantsBySource: {},
        grantsByStatus: {},
        recentGrantEvents7d: 0,
        recentGrantSamples: 0,
        revokedGrants: 0,
      },
    });

    await disclosureOpsOverviewRoute({} as NextApiRequest, createResponse());

    expect(prepareAdminApiRequestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        actor: 'admin',
        rateLimitGroup: 'admin_read',
        route: 'admin/disclosures/operations/overview',
      })
    );
    expect(loadDisclosureOpsOverviewMock).toHaveBeenCalledWith({});
  });

  it('creates webhook subscriptions with encrypted one-time signing secrets', async () => {
    const eventInsertMock = jest.fn(async () => ({ error: null }));
    const insertMock = jest.fn(() => ({
      select: () => ({
        maybeSingle: async () => ({
          data: {
            dapp: 42,
            id: 7,
            secret: '__cubid_encrypted_webhook_signing_secret__',
            secret_auth_tag: 'secret-auth-tag',
            secret_ciphertext: 'secret-ciphertext',
            secret_iv: 'secret-iv',
            webhook: 'credential_added',
            webhook_url: 'https://example.com/webhook',
            wrapped_data_key: 'wrapped-key',
            wrapped_data_key_auth_tag: 'wrapped-key-tag',
            wrapped_data_key_iv: 'wrapped-key-iv',
          },
          error: null,
        }),
      }),
    }));
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'webhook_types') {
          return {
            select: () => ({
              match: () => ({
                maybeSingle: async () => ({
                  data: { id: 1, name: 'credential_added' },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'dapp_webhook_subscriptions') {
          return {
            insert: insertMock,
          };
        }

        if (table === 'api_security_events') {
          return {
            insert: eventInsertMock,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };
    prepareAdminApiRequestMock.mockResolvedValue({
      body: {
        dappId: 42,
        webhookTypeId: 1,
        webhookUrl: 'https://example.com/webhook',
      },
      context: {
        adminUser: { uid: 'admin_uid' },
        supabase,
      },
      requestId: 'admin_request_5',
    });
    getOwnedDappMock.mockResolvedValue({ id: 42 });
    getPlatformUserByEmailMock.mockResolvedValue({ id: 99 });
    encryptWebhookSigningSecretMock.mockResolvedValue({
      secret_algorithm: 'aes-256-gcm-envelope',
      secret_auth_tag: 'secret-auth-tag',
      secret_ciphertext: 'secret-ciphertext',
      secret_context: {
        dappId: '42',
        secretReferenceId: 'secret-ref',
        webhook: 'credential_added',
      },
      secret_iv: 'secret-iv',
      secret_key_id: 'passport_webhook_signing_secret_wrapping_key_v1',
      secret_key_version: 1,
      secret_purpose: 'webhook_signing_secret',
      wrapped_data_key: 'wrapped-key',
      wrapped_data_key_auth_tag: 'wrapped-key-tag',
      wrapped_data_key_iv: 'wrapped-key-iv',
    });

    const response = createResponse();
    await createWebhook({} as NextApiRequest, response);

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        secret: '__cubid_encrypted_webhook_signing_secret__',
        secret_ciphertext: 'secret-ciphertext',
      })
    );
    expect(eventInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event_id: expect.stringMatching(/^api_event_/),
        event_type: 'webhook_signing_secret.created',
        route: 'admin/webhooks/create',
      })
    );
    expect(response.json).toHaveBeenCalledWith({
      data: expect.not.objectContaining({
        secret_ciphertext: expect.anything(),
        wrapped_data_key: expect.anything(),
      }),
    });
    expect(response.json).toHaveBeenCalledWith({
      data: expect.objectContaining({
        webhookSecret: expect.any(String),
      }),
    });
  });

  it('redacts webhook signing secrets from list responses', async () => {
    getOwnedDappIdsMock.mockResolvedValue([42]);
    prepareAdminApiRequestMock.mockResolvedValue({
      body: {},
      context: {
        supabase: {
          from: (table: string) => {
            if (table === 'dapps') {
              return {
                select: () => ({
                  in: async () => ({
                    data: [{ appname: 'Demo App', id: 42 }],
                    error: null,
                  }),
                }),
              };
            }

            if (table === 'dapp_webhook_subscriptions') {
              return {
                select: () => ({
                  in: async () => ({
                    data: [
                      {
                        dapp: 42,
                        id: 7,
                        secret: 'plaintext-secret',
                        secret_ciphertext: 'encrypted-secret',
                        webhook: 'credential_added',
                      },
                    ],
                    error: null,
                  }),
                }),
              };
            }

            throw new Error(`Unexpected table ${table}`);
          },
        },
      },
      requestId: 'admin_request_6',
    });

    const response = createResponse();
    await listWebhooks({} as NextApiRequest, response);

    expect(response.json).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          appName: 'Demo App',
          secretStatus: 'encrypted',
        }),
      ],
    });
    expect(response.json).toHaveBeenCalledWith({
      data: [
        expect.not.objectContaining({
          secret: expect.anything(),
          secret_ciphertext: expect.anything(),
        }),
      ],
    });
  });

  it('uses the sensitive policy for webhook signing secret rotation', async () => {
    prepareAdminApiRequestMock.mockResolvedValue(null);

    await rotateWebhookSecret({} as NextApiRequest, createResponse());

    expect(prepareAdminApiRequestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        actor: 'admin',
        rateLimitGroup: 'admin_sensitive',
        route: 'admin/webhooks/rotate-secret',
      })
    );
  });
});
