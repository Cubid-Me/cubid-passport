import type { NextApiRequest, NextApiResponse } from 'next';

import { adminNoBodySchema } from '../../../../lib/server/adminSchemas';
import {
  getOwnedDappIds,
  prepareAdminApiRequest,
  sendServerError,
} from '../../../../lib/server/adminApi';

const redactWebhookSecretFields = (webhook: Record<string, unknown>) => {
  const {
    secret,
    secret_auth_tag,
    secret_ciphertext,
    secret_context,
    secret_iv,
    wrapped_data_key,
    wrapped_data_key_auth_tag,
    wrapped_data_key_iv,
    ...safeWebhook
  } = webhook;

  void secret;
  void secret_auth_tag;
  void secret_ciphertext;
  void secret_context;
  void secret_iv;
  void wrapped_data_key;
  void wrapped_data_key_auth_tag;
  void wrapped_data_key_iv;

  return safeWebhook;
};

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

    const data = (webhookSubscriptionsResponse.data ?? []).map((webhook) => {
      const safeWebhook = redactWebhookSecretFields(webhook);
      return {
        ...safeWebhook,
        appName: appNameById.get(webhook.dapp) ?? 'Unknown App',
        secretStatus: webhook.secret_ciphertext ? 'encrypted' : 'legacy',
      };
    });

    return res.status(200).json({ data });
  } catch (error) {
    return sendServerError(res, error, 'Failed to load webhooks');
  }
};

export default listWebhooks;
