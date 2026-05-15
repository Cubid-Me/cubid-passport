import type { NextApiRequest, NextApiResponse } from 'next';

import {
  prepareAdminApiRequest,
  sendServerError,
} from '../../../../lib/server/adminApi';
import { adminNotificationOverviewSchema } from '../../../../lib/server/adminSchemas';
import { loadNotificationAdminOverview } from '../../../../lib/server/notificationOperations';

const overview = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminNotificationOverviewSchema,
    rateLimitGroup: 'admin_read',
    route: 'admin/notifications/overview',
  });

  if (!request) {
    return;
  }

  try {
    const data = await loadNotificationAdminOverview(request.context);
    return res.status(200).json({ data });
  } catch (error) {
    return sendServerError(res, error, 'Failed to load notification overview');
  }
};

export default overview;
