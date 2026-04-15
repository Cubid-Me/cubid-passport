import type { NextApiRequest, NextApiResponse } from 'next';

import {
  getOwnedDapp,
  requireAdminUser,
  sendBadRequest,
  sendForbidden,
  sendMethodNotAllowed,
  sendServerError,
} from '../../../../lib/server/adminApi';

const deleteApp = async (req: NextApiRequest, res: NextApiResponse) => {
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
      .from('dapps')
      .delete()
      .match({ id: numericDappId, admin_uid: context.adminUser.uid });

    if (response.error) {
      throw response.error;
    }

    return res.status(200).json({ data: { success: true } });
  } catch (error) {
    return sendServerError(res, error, 'Failed to delete app');
  }
};

export default deleteApp;
