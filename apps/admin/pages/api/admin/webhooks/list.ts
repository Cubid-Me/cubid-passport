import type { NextApiRequest, NextApiResponse } from 'next';

import { adminNoBodySchema } from '../../../../lib/server/adminSchemas';
import {
  getOwnedDappIds,
  prepareAdminApiRequest,
  sendServerError,
} from '../../../../lib/server/adminApi';

const listWebhooks = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminNoBodySchema,
    rateLimitGroup: 'admin_read',
    route: 'admin/webhooks/list',
  });

  if (!request) {
    return;
  }

  try {
    const ownedDappIds = await getOwnedDappIds(request.context);

    if (ownedDappIds.length === 0) {
      return res.status(200).json({ data: [] });
    }

    const [dappsResponse, webhookSubscriptionsResponse] = await Promise.all([
      request.context.supabase
        .from('dapps')
        .select('id, appname')
        .in('id', ownedDappIds),
      request.context.supabase
        .from('dapp_webhook_subscriptions')
        .select('*')
        .in('dapp', ownedDappIds),
    ]);

    if (dappsResponse.error) {
      throw dappsResponse.error;
    }

    if (webhookSubscriptionsResponse.error) {
      throw webhookSubscriptionsResponse.error;
    }

    const appNameById = new Map(
      (dappsResponse.data ?? []).map((dapp) => [dapp.id, dapp.appname])
    );

    const data = (webhookSubscriptionsResponse.data ?? []).map((webhook) => ({
      ...webhook,
      appName: appNameById.get(webhook.dapp) ?? 'Unknown App',
    }));

    return res.status(200).json({ data });
  } catch (error) {
    return sendServerError(res, error, 'Failed to load webhooks');
  }
};

export default listWebhooks;
