import { randomBytes } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

import { adminWebhookCreateSchema } from '../../../../lib/server/adminSchemas';
import {
  getOwnedDapp,
  getPlatformUserByEmail,
  prepareAdminApiRequest,
  sendBadRequest,
  sendForbidden,
  sendServerError,
} from '../../../../lib/server/adminApi';

const createWebhook = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminWebhookCreateSchema,
    rateLimitGroup: 'admin_sensitive',
    route: 'admin/webhooks/create',
  });

  if (!request) {
    return;
  }

  try {
    const { dappId, webhookTypeId, webhookUrl } = request.body;
    const ownedDapp = await getOwnedDapp(request.context, dappId);

    if (!ownedDapp) {
      return sendForbidden(res, 'You do not have access to that app');
    }

    const [platformUser, webhookTypeResponse] = await Promise.all([
      getPlatformUserByEmail(request.context),
      request.context.supabase
        .from('webhook_types')
        .select('*')
        .match({ id: webhookTypeId })
        .maybeSingle(),
    ]);

    if (!platformUser) {
      return sendForbidden(
        res,
        'No matching platform user record exists for this admin'
      );
    }

    if (webhookTypeResponse.error) {
      throw webhookTypeResponse.error;
    }

    if (!webhookTypeResponse.data) {
      return sendBadRequest(res, 'Invalid webhook type');
    }

    const response = await request.context.supabase
      .from('dapp_webhook_subscriptions')
      .insert({
        dapp: dappId,
        webhook_url: webhookUrl,
        webhook: webhookTypeResponse.data.name,
        created_by_user: platformUser.id,
        status: 'active',
        secret: randomBytes(32).toString('hex'),
      })
      .select('*')
      .maybeSingle();

    if (response.error) {
      throw response.error;
    }

    return res.status(200).json({ data: response.data });
  } catch (error) {
    return sendServerError(res, error, 'Failed to create webhook');
  }
};

export default createWebhook;
