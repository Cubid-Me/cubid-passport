import type { NextApiRequest, NextApiResponse } from 'next';

import {
  prepareAdminApiRequest,
  sendServerError,
} from '../../../../../lib/server/adminApi';
import { adminNotificationProviderUpdateSchema } from '../../../../../lib/server/adminSchemas';
import { upsertNotificationProvider } from '../../../../../lib/server/notificationOperations';

const update = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminNotificationProviderUpdateSchema,
    rateLimitGroup: 'admin_sensitive',
    route: 'admin/notifications/providers/update',
  });

  if (!request) {
    return;
  }

  try {
    const provider = await upsertNotificationProvider(
      request.context,
      request.body
    );
    return res.status(200).json({ data: { provider } });
  } catch (error) {
    return sendServerError(res, error, 'Failed to update notification provider');
  }
};

export default update;
