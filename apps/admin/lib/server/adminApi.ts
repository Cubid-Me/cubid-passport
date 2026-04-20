import { getRequiredNumericEnv } from '@cubid/config';
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

export interface VerifiedRequestContext {
  email: string;
  supabase: ReturnType<typeof getSupabase>;
  token: DecodedIdToken;
}

export interface AdminRequestContext extends VerifiedRequestContext {
  adminUser: AdminUserRecord;
}

const getBearerToken = (req: NextApiRequest) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authorizationHeader.slice('Bearer '.length).trim();
};

export const sendMethodNotAllowed = (
  res: NextApiResponse,
  allowedMethods: string[]
) => {
  res.setHeader('Allow', allowedMethods);
  return res.status(405).json({ error: 'Method not allowed' });
};

export const sendBadRequest = (res: NextApiResponse, error: string) => {
  return res.status(400).json({ error });
};

export const sendForbidden = (res: NextApiResponse, error: string) => {
  return res.status(403).json({ error });
};

export const sendUnauthorized = (res: NextApiResponse, error: string) => {
  return res.status(401).json({ error });
};

export const sendServerError = (
  res: NextApiResponse,
  error: unknown,
  fallbackMessage = 'Unexpected server error'
) => {
  logServerError(error);
  return res.status(500).json({ error: fallbackMessage });
};

export const requireVerifiedUser = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<VerifiedRequestContext | null> => {
  const bearerToken = getBearerToken(req);

  if (!bearerToken) {
    sendUnauthorized(res, 'Missing Firebase bearer token');
    return null;
  }

  try {
    const token = await getFirebaseAdminAuth().verifyIdToken(bearerToken);
    const email = token.email;

    if (!email) {
      sendUnauthorized(res, 'Firebase token is missing an email address');
      return null;
    }

    return {
      email,
      supabase: getSupabase(),
      token,
    };
  } catch (error) {
    sendUnauthorized(res, 'Invalid Firebase token');
    logServerError(error);
    return null;
  }
};

export const requireAdminUser = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AdminRequestContext | null> => {
  const verifiedUser = await requireVerifiedUser(req, res);

  if (!verifiedUser) {
    return null;
  }

  const { supabase, email } = verifiedUser;
  const {
    data: adminUser,
    error,
  } = await supabase
    .from('dapp-admin-users')
    .select('*')
    .match({ email })
    .maybeSingle();

  if (error) {
    sendServerError(res, error, 'Failed to load admin user');
    return null;
  }

  if (!isAdminUserRecord(adminUser)) {
    sendForbidden(res, 'This Firebase user is not allowed to access admin APIs');
    return null;
  }

  return {
    ...verifiedUser,
    adminUser,
  };
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

export const getPlatformUserByEmail = async (
  context: AdminRequestContext
) => {
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
