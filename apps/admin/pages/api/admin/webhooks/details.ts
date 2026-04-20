import type { NextApiRequest, NextApiResponse } from 'next';

import {
  getOwnedDapp,
  requireAdminUser,
  sendBadRequest,
  sendForbidden,
  sendMethodNotAllowed,
  sendServerError,
} from '../../../../lib/server/adminApi';

const webhookDetails = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST']);
  }

  const context = await requireAdminUser(req, res);

  if (!context) {
    return;
  }

  const numericDappId = Number(req.body?.dappId);
  const eventType = req.body?.eventType;

  if (!numericDappId || !eventType) {
    return sendBadRequest(res, 'Missing webhook detail fields');
  }

  try {
    const ownedDapp = await getOwnedDapp(context, numericDappId);

    if (!ownedDapp) {
      return sendForbidden(res, 'You do not have access to that app');
    }

    const webhookEventsResponse = await context.supabase
      .from('webhook_events')
      .select('*')
      .match({
        event_type: eventType,
        dapp_id: numericDappId,
      });

    if (webhookEventsResponse.error) {
      throw webhookEventsResponse.error;
    }

    const deliveries: any[] = [];

    for (const event of webhookEventsResponse.data ?? []) {
      const deliveryResponse = await context.supabase
        .from('webhook_event_deliveries')
        .select('*')
        .match({
          webhook_event_id: event.id,
          dapp_id: numericDappId,
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
