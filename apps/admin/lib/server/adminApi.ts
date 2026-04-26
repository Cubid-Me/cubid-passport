import { randomUUID } from 'crypto';
import {
  ApiRateLimitError,
  ApiSecurityError,
  assertAllowedMethod,
  assertAllowedOrigin,
  buildAppErrorEnvelope,
  createCorsHeaders,
  getBearerToken,
  getRequestIdFromNextRequest,
  validateWithSchema,
  z,
  type ZodTypeAny,
} from '@cubid/auth/server';
import { getCsvEnv, getRequiredNumericEnv } from '@cubid/config';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DecodedIdToken } from 'firebase-admin/auth';
import type { NextApiRequest, NextApiResponse } from 'next';

import { getFirebaseAdminAuth } from './firebaseAdmin';
import { getSupabase } from './supabase';

interface AdminUserRecord {
  email: string;
  users_id?: number | string | null;
  uid: string;
  [key: string]: unknown;
}

interface PlatformUserRecord {
  email: string;
  firebase_uid?: string | null;
  id: number | string;
  [key: string]: unknown;
}

type AdminRateLimitGroup =
  | 'admin_auth_sync'
  | 'admin_mutation'
  | 'admin_read'
  | 'admin_sensitive';

type AdminRateLimitTier = 'starter' | 'trusted' | 'internal';
type AdminRouteActor = 'admin' | 'user';

type AdminRouteOptions<TSchema extends ZodTypeAny | undefined> = {
  actor: AdminRouteActor;
  allowedMethods?: string[];
  bodySchema?: TSchema;
  rateLimitGroup: AdminRateLimitGroup;
  route: string;
};

type AdminRouteContextByActor<TActor extends AdminRouteActor> =
  TActor extends 'admin' ? AdminRequestContext : VerifiedRequestContext;

type AdminRouteBody<TSchema extends ZodTypeAny | undefined> =
  TSchema extends ZodTypeAny ? z.infer<TSchema> : undefined;

interface AdminResponseState {
  corsHeaders: Record<string, string>;
  requestId: string;
}

interface BucketRow {
  bucket_key: string;
  count: number;
  window_start: string;
}

const WINDOW_MS = 60 * 1000;

const ADMIN_RATE_LIMITS: Record<
  AdminRateLimitGroup,
  Record<AdminRateLimitTier, number>
> = {
  admin_auth_sync: { starter: 10, trusted: 30, internal: 120 },
  admin_read: { starter: 120, trusted: 300, internal: 1200 },
  admin_mutation: { starter: 30, trusted: 120, internal: 600 },
  admin_sensitive: { starter: 10, trusted: 30, internal: 120 },
};

const RESPONSE_STATE_KEY = '__cubidAdminApiState';

const isAdminUserRecord = (value: unknown): value is AdminUserRecord => {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { email?: unknown }).email === 'string' &&
    typeof (value as { uid?: unknown }).uid === 'string'
  );
};

const isPlatformUserRecord = (value: unknown): value is PlatformUserRecord => {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { email?: unknown }).email === 'string' &&
    (typeof (value as { id?: unknown }).id === 'string' ||
      typeof (value as { id?: unknown }).id === 'number')
  );
};

const formatErrorForLogs = (error: unknown) => {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

const logServerError = (error: unknown) => {
  process.stderr.write(`${formatErrorForLogs(error)}\n`);
};

const getResponseState = (
  res: NextApiResponse
): AdminResponseState | undefined => {
  return (res as NextApiResponse & { [RESPONSE_STATE_KEY]?: AdminResponseState })[
    RESPONSE_STATE_KEY
  ];
};

const setResponseState = (
  res: NextApiResponse,
  state: AdminResponseState
) => {
  (
    res as NextApiResponse & { [RESPONSE_STATE_KEY]?: AdminResponseState }
  )[RESPONSE_STATE_KEY] = state;
  res.setHeader('X-Request-Id', state.requestId);
  for (const [key, value] of Object.entries(state.corsHeaders)) {
    res.setHeader(key, value);
  }
};

const ensureResponseState = (res: NextApiResponse): AdminResponseState => {
  const existingState = getResponseState(res);

  if (existingState) {
    return existingState;
  }

  const state = {
    corsHeaders: {},
    requestId: `admin_${randomUUID()}`,
  };
  setResponseState(res, state);
  return state;
};

const getAllowedOrigins = () => getCsvEnv('ADMIN_CORS_ALLOWED_ORIGINS');

const getIpAddress = (req: NextApiRequest) => {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (Array.isArray(forwardedFor)) {
    return forwardedFor[0]?.split(',')[0]?.trim() ?? null;
  }

  if (typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0]?.trim() ?? null;
  }

  const realIp = req.headers['x-real-ip'];

  if (Array.isArray(realIp)) {
    return realIp[0]?.trim() ?? null;
  }

  return typeof realIp === 'string' ? realIp.trim() : null;
};

const getRateLimitTier = (actorType: AdminRouteActor): AdminRateLimitTier => {
  return actorType === 'admin' || actorType === 'user' ? 'trusted' : 'starter';
};

const getRateLimitKey = (
  token: DecodedIdToken,
  req: NextApiRequest,
  actorType: AdminRouteActor
) => {
  if (actorType === 'user') {
    return token.uid || token.email || getIpAddress(req) || 'admin_user';
  }

  return token.uid || token.email || getIpAddress(req) || 'admin';
};

const createBucketKey = (route: string, key: string, windowStartMs: number) => {
  return `${route}:${key}:${windowStartMs}`;
};

const getAdminLimit = (
  route: AdminRateLimitGroup,
  tier: AdminRateLimitTier
) => {
  return ADMIN_RATE_LIMITS[route][tier];
};

const getSecurityEventType = (error: ApiSecurityError) => {
  switch (error.code) {
    case 'invalid_request':
      return 'validation.failed';
    case 'method_not_allowed':
      return 'method.denied';
    case 'origin_not_allowed':
    case 'origin_required':
      return 'origin.denied';
    case 'rate_limit_exceeded':
      return 'rate_limit.denied';
    case 'forbidden':
      return 'authorization.denied';
    case 'unauthorized':
      return 'authentication.denied';
    default:
      return 'request.denied';
  }
};

const logSecurityEvent = async (input: {
  actorIdentifier?: string | null;
  actorType: string;
  details?: Record<string, unknown>;
  eventType: string;
  outcome: 'failure' | 'success';
  requestId: string;
  route: string;
}) => {
  const { error } = await getSupabase().from('api_security_events').insert({
    actor_identifier: input.actorIdentifier ?? null,
    actor_type: input.actorType,
    details: input.details ?? {},
    event_id: `api_event_${randomUUID().replace(/-/g, '')}`,
    event_type: input.eventType,
    outcome: input.outcome,
    request_id: input.requestId,
    route: input.route,
  });

  if (error) {
    logServerError(error);
  }
};

const enforceRateLimit = async (input: {
  actorIdentifier?: string | null;
  actorType: AdminRouteActor;
  key: string;
  requestId: string;
  route: AdminRateLimitGroup;
  supabase: SupabaseClient;
}) => {
  const tier = getRateLimitTier(input.actorType);

  if (tier === 'internal') {
    return;
  }

  const limit = getAdminLimit(input.route, tier);
  const windowStartMs = Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS;
  const windowStart = new Date(windowStartMs).toISOString();
  const bucketKey = createBucketKey(input.route, input.key, windowStartMs);

  const { data: existing, error: lookupError } = await input.supabase
    .from('api_rate_limit_buckets')
    .select('bucket_key,count,window_start')
    .eq('bucket_key', bucketKey)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  const bucket = (existing as BucketRow | null) ?? null;
  const nextCount = (bucket?.count ?? 0) + 1;

  if (nextCount > limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowStartMs + WINDOW_MS - Date.now()) / 1000)
    );

    await logSecurityEvent({
      actorIdentifier: input.actorIdentifier ?? input.key,
      actorType: input.actorType,
      details: {
        limit,
        rateLimitGroup: input.route,
        tier,
        windowStart,
      },
      eventType: 'rate_limit.denied',
      outcome: 'failure',
      requestId: input.requestId,
      route: input.route,
    });

    throw new ApiRateLimitError(
      retryAfterSeconds,
      'Too many requests for this Admin API.'
    );
  }

  const { error: upsertError } = await input.supabase
    .from('api_rate_limit_buckets')
    .upsert({
      bucket_key: bucketKey,
      count: nextCount,
      expires_at: new Date(windowStartMs + WINDOW_MS).toISOString(),
      limit_key: input.key,
      metadata: {
        actor_identifier: input.actorIdentifier ?? null,
        actor_type: input.actorType,
      },
      route: input.route,
      tier,
      updated_at: new Date().toISOString(),
      window_start: windowStart,
    });

  if (upsertError) {
    throw upsertError;
  }
};

const sendAppError = (
  res: NextApiResponse,
  error: unknown,
  fallbackMessage = 'Unexpected server error'
) => {
  if (!(error instanceof ApiSecurityError)) {
    logServerError(error);
  }

  const state = ensureResponseState(res);
  const envelope = buildAppErrorEnvelope(
    state.requestId,
    error,
    fallbackMessage
  );

  for (const [key, value] of Object.entries(envelope.headers)) {
    res.setHeader(key, value);
  }

  return res.status(envelope.statusCode).json(envelope.body);
};

const buildVerifiedRequestContext = async (
  req: NextApiRequest
): Promise<VerifiedRequestContext> => {
  const bearerToken = getBearerToken(req);

  if (!bearerToken) {
    throw new ApiSecurityError(
      401,
      'unauthorized',
      'Missing Firebase bearer token'
    );
  }

  let token: DecodedIdToken;

  try {
    token = await getFirebaseAdminAuth().verifyIdToken(bearerToken);
  } catch (error) {
    logServerError(error);
    throw new ApiSecurityError(401, 'unauthorized', 'Invalid Firebase token');
  }

  const email = token.email?.trim();

  if (!email) {
    throw new ApiSecurityError(
      401,
      'unauthorized',
      'Firebase token is missing an email address'
    );
  }

  return {
    email,
    requestId: getRequestIdFromNextRequest(req, 'admin'),
    supabase: getSupabase(),
    token,
  };
};

const buildAdminRequestContext = async (
  req: NextApiRequest
): Promise<AdminRequestContext> => {
  const verifiedUser = await buildVerifiedRequestContext(req);
  const { supabase, email } = verifiedUser;
  const { data: adminUser, error } = await supabase
    .from('dapp-admin-users')
    .select('*')
    .match({ email })
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!isAdminUserRecord(adminUser)) {
    throw new ApiSecurityError(
      403,
      'forbidden',
      'This Firebase user is not allowed to access admin APIs'
    );
  }

  return {
    ...verifiedUser,
    adminUser,
  };
};

export interface VerifiedRequestContext {
  email: string;
  requestId: string;
  supabase: ReturnType<typeof getSupabase>;
  token: DecodedIdToken;
}

export interface AdminRequestContext extends VerifiedRequestContext {
  adminUser: AdminUserRecord;
}

export const sendMethodNotAllowed = (
  res: NextApiResponse,
  allowedMethods: string[]
) => {
  return sendAppError(
    res,
    new ApiSecurityError(405, 'method_not_allowed', 'Method not allowed', {
      headers: {
        Allow: allowedMethods.join(', '),
      },
    })
  );
};

export const sendBadRequest = (res: NextApiResponse, error: string) => {
  return sendAppError(res, new ApiSecurityError(400, 'invalid_request', error));
};

export const sendForbidden = (res: NextApiResponse, error: string) => {
  return sendAppError(res, new ApiSecurityError(403, 'forbidden', error));
};

export const sendUnauthorized = (res: NextApiResponse, error: string) => {
  return sendAppError(res, new ApiSecurityError(401, 'unauthorized', error));
};

export const sendServerError = (
  res: NextApiResponse,
  error: unknown,
  fallbackMessage = 'Unexpected server error'
) => {
  return sendAppError(res, error, fallbackMessage);
};

export const prepareAdminApiRequest = async <
  TActor extends AdminRouteActor,
  TSchema extends ZodTypeAny | undefined = undefined,
>(
  req: NextApiRequest,
  res: NextApiResponse,
  options: AdminRouteOptions<TSchema> & { actor: TActor }
): Promise<
  | {
      body: AdminRouteBody<TSchema>;
      context: AdminRouteContextByActor<TActor>;
      requestId: string;
    }
  | null
> => {
  const allowedMethods = options.allowedMethods ?? ['POST'];
  const requestId = getRequestIdFromNextRequest(req, 'admin');

  try {
    if (req.method?.toUpperCase() === 'OPTIONS') {
      const origin = assertAllowedOrigin(
        req.headers.origin?.trim() ?? null,
        getAllowedOrigins(),
        {
          allowMissingOrigin: false,
        }
      );
      const corsHeaders = createCorsHeaders(origin, allowedMethods);
      setResponseState(res, { corsHeaders, requestId });
      res.status(204).end();
      return null;
    }

    assertAllowedMethod(req.method ?? 'GET', allowedMethods);

    const origin = assertAllowedOrigin(
      req.headers.origin?.trim() ?? null,
      getAllowedOrigins()
    );
    const corsHeaders = createCorsHeaders(origin, allowedMethods);

    setResponseState(res, { corsHeaders, requestId });

    const context =
      options.actor === 'admin'
        ? await buildAdminRequestContext(req)
        : await buildVerifiedRequestContext(req);

    const rateLimitKey = getRateLimitKey(context.token, req, options.actor);

    await enforceRateLimit({
      actorIdentifier: context.token.uid,
      actorType: options.actor,
      key: rateLimitKey,
      requestId,
      route: options.rateLimitGroup,
      supabase: context.supabase,
    });

    const body = options.bodySchema
      ? (validateWithSchema(
          req.body ?? {},
          options.bodySchema,
          'Admin request payload is invalid.'
        ) as AdminRouteBody<TSchema>)
      : (undefined as AdminRouteBody<TSchema>);

    return {
      body,
      context: {
        ...context,
        requestId,
      } as AdminRouteContextByActor<TActor>,
      requestId,
    };
  } catch (error) {
    if (error instanceof ApiSecurityError) {
      await logSecurityEvent({
        actorIdentifier:
          getBearerToken(req)?.slice(0, 12) ?? getIpAddress(req) ?? null,
        actorType: options.actor,
        details: {
          code: error.code,
          method: req.method?.toUpperCase() ?? 'GET',
          origin: req.headers.origin ?? null,
        },
        eventType: getSecurityEventType(error),
        outcome: 'failure',
        requestId,
        route: options.route,
      });
    }

    sendAppError(res, error);
    return null;
  }
};

export const requireVerifiedUser = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<VerifiedRequestContext | null> => {
  const prepared = await prepareAdminApiRequest(req, res, {
    actor: 'user',
    rateLimitGroup: 'admin_auth_sync',
    route: 'admin/auth/sync',
  });

  return prepared?.context ?? null;
};

export const requireAdminUser = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AdminRequestContext | null> => {
  const prepared = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    rateLimitGroup: 'admin_read',
    route: 'admin/default',
  });

  return prepared?.context ?? null;
};

const ensurePlatformUserRecord = async (context: VerifiedRequestContext) => {
  const { supabase, email, token } = context;
  const existingPlatformUser = await supabase
    .from('users')
    .select('*')
    .match({ email })
    .maybeSingle();

  if (existingPlatformUser.error) {
    throw existingPlatformUser.error;
  }

  if (!existingPlatformUser.data) {
    const insertedPlatformUser = await supabase
      .from('users')
      .insert({
        email,
        firebase_uid: token.uid,
      })
      .select('*')
      .maybeSingle();

    if (insertedPlatformUser.error) {
      throw insertedPlatformUser.error;
    }

    if (!isPlatformUserRecord(insertedPlatformUser.data)) {
      throw new Error('Failed to sync platform user record');
    }

    return insertedPlatformUser.data;
  }

  if (!isPlatformUserRecord(existingPlatformUser.data)) {
    throw new Error('Failed to sync platform user record');
  }

  if (existingPlatformUser.data.firebase_uid !== token.uid) {
    const updatedPlatformUser = await supabase
      .from('users')
      .update({
        firebase_uid: token.uid,
      })
      .match({ id: existingPlatformUser.data.id })
      .select('*')
      .maybeSingle();

    if (updatedPlatformUser.error) {
      throw updatedPlatformUser.error;
    }

    if (!isPlatformUserRecord(updatedPlatformUser.data)) {
      throw new Error('Failed to sync platform user record');
    }

    return updatedPlatformUser.data;
  }

  return existingPlatformUser.data;
};

export const ensureAdminUserRecord = async (
  context: VerifiedRequestContext
) => {
  const { supabase, email } = context;
  const platformUser = await ensurePlatformUserRecord(context);

  const existingAdminUser = await supabase
    .from('dapp-admin-users')
    .select('*')
    .match({ email })
    .maybeSingle();

  if (existingAdminUser.error) {
    throw existingAdminUser.error;
  }

  if (!existingAdminUser.data) {
    const insertedAdminUser = await supabase
      .from('dapp-admin-users')
      .insert({
        dapp_id: getRequiredNumericEnv('DAPP_ID'),
        email,
        users_id: platformUser.id,
      })
      .select('*')
      .maybeSingle();

    if (insertedAdminUser.error) {
      throw insertedAdminUser.error;
    }

    return insertedAdminUser.data;
  }

  if (existingAdminUser.data.users_id !== platformUser.id) {
    const updatedAdminUser = await supabase
      .from('dapp-admin-users')
      .update({
        users_id: platformUser.id,
      })
      .match({ email })
      .select('*')
      .maybeSingle();

    if (updatedAdminUser.error) {
      throw updatedAdminUser.error;
    }

    return updatedAdminUser.data;
  }

  return existingAdminUser.data;
};

export const getOwnedDapp = async (
  context: AdminRequestContext,
  dappId: number | string
) => {
  const { supabase, adminUser } = context;

  const response = await supabase
    .from('dapps')
    .select('*')
    .match({
      id: dappId,
      admin_uid: adminUser.uid,
    })
    .maybeSingle();

  if (response.error) {
    throw response.error;
  }

  return response.data;
};

export const getOwnedDappIds = async (context: AdminRequestContext) => {
  const { supabase, adminUser } = context;
  const response = await supabase
    .from('dapps')
    .select('id')
    .match({ admin_uid: adminUser.uid });

  if (response.error) {
    throw response.error;
  }

  return (response.data ?? []).map((dapp) => dapp.id);
};

export const getOwnedPage = async (
  context: AdminRequestContext,
  pageId: number | string
) => {
  const { supabase } = context;
  const pageResponse = await supabase
    .from('dapp_pages')
    .select('*')
    .match({ id: pageId })
    .maybeSingle();

  if (pageResponse.error) {
    throw pageResponse.error;
  }

  if (!pageResponse.data) {
    return null;
  }

  const ownedDapp = await getOwnedDapp(
    context,
    pageResponse.data.dapp_id as string | number
  );

  if (!ownedDapp) {
    return null;
  }

  return pageResponse.data;
};

export const getPlatformUserByEmail = async (context: AdminRequestContext) => {
  const { supabase, email } = context;
  const response = await supabase
    .from('users')
    .select('*')
    .match({ email })
    .maybeSingle();

  if (response.error) {
    throw response.error;
  }

  return response.data;
};
