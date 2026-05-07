import type { NextApiRequest, NextApiResponse } from 'next';

import { adminNoBodySchema } from '../../../lib/server/adminSchemas';
import {
  prepareAdminApiRequest,
  sendServerError,
} from '../../../lib/server/adminApi';

const metadata = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminNoBodySchema,
    rateLimitGroup: 'admin_read',
    route: 'admin/metadata',
  });

  if (!request) {
    return;
  }

  try {
    const [schemasResponse, stampTypesResponse, webhookTypesResponse] =
      await Promise.all([
        request.context.supabase.from('stampscore_schemas').select('*'),
        request.context.supabase.from('stamptypes').select('*'),
        request.context.supabase.from('webhook_types').select('*'),
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
