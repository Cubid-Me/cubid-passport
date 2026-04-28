import type { NextApiRequest, NextApiResponse } from 'next';

import { adminDappIdSchema } from './adminSchemas';
import { prepareAdminApiRequest } from './adminApi';

const verifyIdTokenMock = jest.fn();
const getSupabaseMock = jest.fn();

jest.mock('./firebaseAdmin', () => ({
  getFirebaseAdminAuth: () => ({
    verifyIdToken: verifyIdTokenMock,
  }),
}));

jest.mock('./supabase', () => ({
  getSupabase: () => getSupabaseMock(),
}));

const createResponse = () => {
  const headers: Record<string, string> = {};
  const res = {
    body: undefined as unknown,
    headers,
    json: jest.fn(function json(payload: unknown) {
      res.body = payload;
      return res;
    }),
    setHeader: jest.fn((key: string, value: string) => {
      headers[key.toLowerCase()] = value;
      return res;
    }),
    status: jest.fn((statusCode: number) => {
      res.statusCode = statusCode;
      return res;
    }),
    statusCode: 200,
  };

  return res as unknown as NextApiResponse & {
    body?: unknown;
    headers: Record<string, string>;
  };
};

const createSupabase = (
  adminUser: unknown,
  options: { bucketCount?: number } = {}
) => ({
  from(table: string) {
    if (table === 'dapp-admin-users') {
      return {
        select() {
          return {
            match() {
              return {
                async maybeSingle() {
                  return {
                    data: adminUser,
                    error: null,
                  };
                },
              };
            },
          };
        },
      };
    }

    if (table === 'api_rate_limit_buckets') {
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  return {
                    data:
                      typeof options.bucketCount === 'number'
                        ? {
                            bucket_key: 'bucket_key',
                            count: options.bucketCount,
                            window_start: new Date(0).toISOString(),
                          }
                        : null,
                    error: null,
                  };
                },
              };
            },
          };
        },
        async upsert() {
          return { error: null };
        },
      };
    }

    if (table === 'api_security_events') {
      return {
        async insert() {
          return { error: null };
        },
      };
    }

    throw new Error(`Unexpected table ${table}`);
  },
});

describe('adminApi security baseline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_CORS_ALLOWED_ORIGINS = 'https://admin.cubid.me';
    verifyIdTokenMock.mockResolvedValue({
      email: 'admin@example.com',
      uid: 'firebase_uid_123',
    });
    getSupabaseMock.mockReturnValue(
      createSupabase({
        email: 'admin@example.com',
        uid: 'firebase_uid_123',
      })
    );
  });

  it('reuses incoming request ids and returns a parsed admin context on success', async () => {
    const req = {
      body: {
        dappId: '42',
      },
      headers: {
        authorization: 'Bearer test-token',
        origin: 'https://admin.cubid.me',
        'x-request-id': 'incoming_admin_request',
      },
      method: 'POST',
    } as unknown as NextApiRequest;
    const res = createResponse();

    const prepared = await prepareAdminApiRequest(req, res, {
      actor: 'admin',
      bodySchema: adminDappIdSchema,
      rateLimitGroup: 'admin_read',
      route: 'admin/apps/config',
    });

    expect(prepared?.requestId).toBe('incoming_admin_request');
    expect(prepared?.body).toEqual({ dappId: 42 });
    expect(res.headers['x-request-id']).toBe('incoming_admin_request');
    expect(res.headers['access-control-allow-origin']).toBe(
      'https://admin.cubid.me'
    );
  });

  it('rejects explicit disallowed origins with the structured error envelope', async () => {
    const req = {
      body: {},
      headers: {
        authorization: 'Bearer test-token',
        origin: 'https://evil.example.com',
      },
      method: 'POST',
    } as unknown as NextApiRequest;
    const res = createResponse();

    const prepared = await prepareAdminApiRequest(req, res, {
      actor: 'admin',
      bodySchema: adminDappIdSchema,
      rateLimitGroup: 'admin_read',
      route: 'admin/apps/config',
    });

    expect(prepared).toBeNull();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body).toEqual({
      error: {
        code: 'origin_not_allowed',
        message: 'Origin is not allowed for this API.',
        requestId: expect.stringMatching(/^admin_/),
        details: {
          origin: 'https://evil.example.com',
        },
      },
    });
  });

  it('rejects requests that do not include a Firebase bearer token', async () => {
    const req = {
      body: {
        dappId: 42,
      },
      headers: {
        origin: 'https://admin.cubid.me',
      },
      method: 'POST',
    } as unknown as NextApiRequest;
    const res = createResponse();

    const prepared = await prepareAdminApiRequest(req, res, {
      actor: 'admin',
      bodySchema: adminDappIdSchema,
      rateLimitGroup: 'admin_read',
      route: 'admin/apps/config',
    });

    expect(prepared).toBeNull();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toEqual({
      error: {
        code: 'unauthorized',
        message: 'Missing Firebase bearer token',
        requestId: expect.stringMatching(/^admin_/),
      },
    });
  });

  it('rejects non-admin callers before route execution', async () => {
    getSupabaseMock.mockReturnValue(createSupabase(null));

    const req = {
      body: {
        dappId: 42,
      },
      headers: {
        authorization: 'Bearer test-token',
        origin: 'https://admin.cubid.me',
      },
      method: 'POST',
    } as unknown as NextApiRequest;
    const res = createResponse();

    const prepared = await prepareAdminApiRequest(req, res, {
      actor: 'admin',
      bodySchema: adminDappIdSchema,
      rateLimitGroup: 'admin_read',
      route: 'admin/apps/config',
    });

    expect(prepared).toBeNull();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body).toEqual({
      error: {
        code: 'forbidden',
        message: 'This Firebase user is not allowed to access admin APIs',
        requestId: expect.stringMatching(/^admin_/),
      },
    });
  });

  it('returns validation details when the request body is malformed', async () => {
    const req = {
      body: {
        dappId: 'not-a-number',
      },
      headers: {
        authorization: 'Bearer test-token',
        origin: 'https://admin.cubid.me',
      },
      method: 'POST',
    } as unknown as NextApiRequest;
    const res = createResponse();

    const prepared = await prepareAdminApiRequest(req, res, {
      actor: 'admin',
      bodySchema: adminDappIdSchema,
      rateLimitGroup: 'admin_read',
      route: 'admin/apps/config',
    });

    expect(prepared).toBeNull();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({
      error: {
        code: 'invalid_request',
        message: 'Admin request payload is invalid.',
        requestId: expect.stringMatching(/^admin_/),
        details: {
          issues: expect.any(Array),
        },
      },
    });
  });

  it('returns a rate-limit denial when the trusted threshold is exceeded', async () => {
    getSupabaseMock.mockReturnValue(
      createSupabase(
        {
          email: 'admin@example.com',
          uid: 'firebase_uid_123',
        },
        {
          bucketCount: 300,
        }
      )
    );

    const req = {
      body: {
        dappId: 42,
      },
      headers: {
        authorization: 'Bearer test-token',
        origin: 'https://admin.cubid.me',
      },
      method: 'POST',
    } as unknown as NextApiRequest;
    const res = createResponse();

    const prepared = await prepareAdminApiRequest(req, res, {
      actor: 'admin',
      bodySchema: adminDappIdSchema,
      rateLimitGroup: 'admin_read',
      route: 'admin/apps/config',
    });

    expect(prepared).toBeNull();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.body).toEqual({
      error: {
        code: 'rate_limit_exceeded',
        message: 'Too many requests for this Admin API.',
        requestId: expect.stringMatching(/^admin_/),
      },
    });
  });
});
