import type { NextApiRequest, NextApiResponse } from 'next';

import {
  prepareAdminApiRequest,
  sendBadRequest,
  sendServerError,
} from '../../../../../lib/server/adminApi';
import { adminNotificationAppPolicyUpsertSchema } from '../../../../../lib/server/adminSchemas';
import {
  isNotificationInputError,
  upsertNotificationAppPolicy,
} from '../../../../../lib/server/notificationOperations';

const upsert = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminNotificationAppPolicyUpsertSchema,
    rateLimitGroup: 'admin_sensitive',
    route: 'admin/notifications/app-policy/upsert',
  });

  if (!request) {
    return;
  }

  try {
    const policy = await upsertNotificationAppPolicy(
      request.context,
      request.body
    );
    return res.status(200).json({ data: { policy } });
  } catch (error) {
    if (isNotificationInputError(error)) {
      return sendBadRequest(res, error.message);
    }

    return sendServerError(res, error, 'Failed to save notification policy');
  }
};

export default upsert;
