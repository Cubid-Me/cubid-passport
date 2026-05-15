import type { NextApiRequest, NextApiResponse } from 'next';

import {
  prepareAdminApiRequest,
  sendServerError,
} from '../../../../../lib/server/adminApi';
import { adminNotificationCategoryUpsertSchema } from '../../../../../lib/server/adminSchemas';
import { upsertNotificationCategory } from '../../../../../lib/server/notificationOperations';

const upsert = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminNotificationCategoryUpsertSchema,
    rateLimitGroup: 'admin_sensitive',
    route: 'admin/notifications/categories/upsert',
  });

  if (!request) {
    return;
  }

  try {
    const category = await upsertNotificationCategory(
      request.context,
      request.body
    );
    return res.status(200).json({ data: { category } });
  } catch (error) {
    return sendServerError(res, error, 'Failed to save notification category');
  }
};

export default upsert;
