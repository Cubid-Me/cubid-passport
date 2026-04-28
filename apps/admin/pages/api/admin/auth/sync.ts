import type { NextApiRequest, NextApiResponse } from 'next';

import { adminNoBodySchema } from '../../../../lib/server/adminSchemas';
import {
  ensureAdminUserRecord,
  prepareAdminApiRequest,
  sendServerError,
} from '../../../../lib/server/adminApi';

const syncAdminUser = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'user',
    bodySchema: adminNoBodySchema,
    rateLimitGroup: 'admin_auth_sync',
    route: 'admin/auth/sync',
  });

  if (!request) {
    return;
  }

  try {
    const adminUser = await ensureAdminUserRecord(request.context);
    return res.status(200).json({ data: { adminUser } });
  } catch (error) {
    return sendServerError(res, error, 'Failed to sync admin user');
  }
};

export default syncAdminUser;
