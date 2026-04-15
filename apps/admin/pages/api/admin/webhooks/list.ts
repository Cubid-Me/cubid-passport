import type { NextApiRequest, NextApiResponse } from 'next';

import {
  getOwnedDappIds,
  requireAdminUser,
  sendMethodNotAllowed,
  sendServerError,
} from '../../../../lib/server/adminApi';

const listWebhooks = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST']);
  }

  const context = await requireAdminUser(req, res);

  if (!context) {
    return;
  }

  try {
    const ownedDappIds = await getOwnedDappIds(context);

    if (ownedDappIds.length === 0) {
      return res.status(200).json({ data: [] });
    }

    const [dappsResponse, webhookSubscriptionsResponse] = await Promise.all([
      context.supabase.from('dapps').select('id, appname').in('id', ownedDappIds),
      context.supabase
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
