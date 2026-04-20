import { randomBytes } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

import {
  getOwnedDapp,
  getPlatformUserByEmail,
  requireAdminUser,
  sendBadRequest,
  sendForbidden,
  sendMethodNotAllowed,
  sendServerError,
} from '../../../../lib/server/adminApi';

const createWebhook = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST']);
  }

  const context = await requireAdminUser(req, res);

  if (!context) {
    return;
  }

  const numericDappId = Number(req.body?.dappId);
  const numericWebhookTypeId = Number(req.body?.webhookTypeId);
  const webhookUrl = req.body?.webhookUrl;

  if (!numericDappId || !numericWebhookTypeId || !webhookUrl) {
    return sendBadRequest(res, 'Missing webhook creation fields');
  }

  try {
    const ownedDapp = await getOwnedDapp(context, numericDappId);

    if (!ownedDapp) {
      return sendForbidden(res, 'You do not have access to that app');
    }

    const [platformUser, webhookTypeResponse] = await Promise.all([
      getPlatformUserByEmail(context),
      context.supabase
        .from('webhook_types')
        .select('*')
        .match({ id: numericWebhookTypeId })
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

    const response = await context.supabase
      .from('dapp_webhook_subscriptions')
      .insert({
        dapp: numericDappId,
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
