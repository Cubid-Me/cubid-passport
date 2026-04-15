import type { NextApiRequest, NextApiResponse } from 'next';

import {
  requireAdminUser,
  sendMethodNotAllowed,
  sendServerError,
} from '../../../lib/server/adminApi';

const metadata = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST']);
  }

  const context = await requireAdminUser(req, res);

  if (!context) {
    return;
  }

  try {
    const [schemasResponse, stampTypesResponse, webhookTypesResponse] =
      await Promise.all([
        context.supabase.from('stampscore_schemas').select('*'),
        context.supabase.from('stamptypes').select('*'),
        context.supabase.from('webhook_types').select('*'),
      ]);

    const responseError =
      schemasResponse.error ||
      stampTypesResponse.error ||
      webhookTypesResponse.error;

    if (responseError) {
      throw responseError;
    }

    return res.status(200).json({
      data: {
        schemas: schemasResponse.data ?? [],
        stampTypes: stampTypesResponse.data ?? [],
        webhookTypes: webhookTypesResponse.data ?? [],
      },
    });
  } catch (error) {
    return sendServerError(res, error, 'Failed to load admin metadata');
  }
};

export default metadata;
