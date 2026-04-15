import type { NextApiRequest, NextApiResponse } from 'next';

import {
  getOwnedDapp,
  requireAdminUser,
  sendBadRequest,
  sendForbidden,
  sendMethodNotAllowed,
  sendServerError,
} from '../../../../lib/server/adminApi';

const pageConfig = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST']);
  }

  const context = await requireAdminUser(req, res);

  if (!context) {
    return;
  }

  const numericDappId = Number(req.body?.dappId);

  if (!numericDappId) {
    return sendBadRequest(res, 'Missing dappId');
  }

  try {
    const ownedDapp = await getOwnedDapp(context, numericDappId);

    if (!ownedDapp) {
      return sendForbidden(res, 'You do not have access to that app');
    }

    const response = await context.supabase
      .from('dapp_stamptypes')
      .select('*')
      .match({ dapp_id: numericDappId });

    if (response.error) {
      throw response.error;
    }

    return res.status(200).json({ data: response.data ?? [] });
  } catch (error) {
    return sendServerError(res, error, 'Failed to load page config');
  }
};

export default pageConfig;
