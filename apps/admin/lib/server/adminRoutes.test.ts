import type { NextApiRequest, NextApiResponse } from 'next';

import syncAdminUser from '../../pages/api/admin/auth/sync';
import metadata from '../../pages/api/admin/metadata';
import updateOidcClientOpsRoute from '../../pages/api/admin/oidc/clients/update-ops';
import rotateKey from '../../pages/api/admin/apps/rotate-key';

const prepareAdminApiRequestMock = jest.fn();
const ensureAdminUserRecordMock = jest.fn();
const getOwnedDappMock = jest.fn();
const rotateDappApiKeyMock = jest.fn();
const updateOidcClientOpsMock = jest.fn();
const normalizeClientOpsUpdateInputMock = jest.fn();

jest.mock('./adminApi', () => ({
  getOwnedDapp: (...args: unknown[]) => getOwnedDappMock(...args),
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

jest.mock('./dappApiKeys', () => ({
  rotateDappApiKey: (...args: unknown[]) => rotateDappApiKeyMock(...args),
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
});
