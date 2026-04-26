import type { NextApiRequest, NextApiResponse } from 'next';

import { adminNoBodySchema } from '../../../../lib/server/adminSchemas';
import {
  prepareAdminApiRequest,
  sendServerError,
} from '../../../../lib/server/adminApi';

const listApps = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminNoBodySchema,
    rateLimitGroup: 'admin_read',
    route: 'admin/apps/list',
  });

  if (!request) {
    return;
  }

  try {
    const { data, error } = await request.context.supabase
      .from('dapps')
      .select('*')
      .match({ admin_uid: request.context.adminUser.uid });

    if (error) {
      throw error;
    }

    return res.status(200).json({ data: data ?? [] });
  } catch (error) {
    return sendServerError(res, error, 'Failed to load apps');
  }
};

export default listApps;
