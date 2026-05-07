import type { NextApiRequest, NextApiResponse } from 'next';

import { adminWebhookDetailsSchema } from '../../../../lib/server/adminSchemas';
import {
  getOwnedDapp,
  prepareAdminApiRequest,
  sendForbidden,
  sendServerError,
} from '../../../../lib/server/adminApi';

const webhookDetails = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminWebhookDetailsSchema,
    rateLimitGroup: 'admin_read',
    route: 'admin/webhooks/details',
  });

  if (!request) {
    return;
  }

  try {
    const { dappId, eventType } = request.body;
    const ownedDapp = await getOwnedDapp(request.context, dappId);

    if (!ownedDapp) {
      return sendForbidden(res, 'You do not have access to that app');
    }

    const webhookEventsResponse = await request.context.supabase
      .from('webhook_events')
      .select('*')
      .match({
        event_type: eventType,
        dapp_id: dappId,
      });

    if (webhookEventsResponse.error) {
      throw webhookEventsResponse.error;
    }

    const deliveries: any[] = [];

    for (const event of webhookEventsResponse.data ?? []) {
      const deliveryResponse = await request.context.supabase
        .from('webhook_event_deliveries')
        .select('*')
        .match({
          webhook_event_id: event.id,
          dapp_id: dappId,
        });

      if (deliveryResponse.error) {
        throw deliveryResponse.error;
      }

      deliveries.push(...(deliveryResponse.data ?? []));
    }

    return res.status(200).json({ data: deliveries });
  } catch (error) {
    return sendServerError(res, error, 'Failed to load webhook deliveries');
  }
};

export default webhookDetails;
