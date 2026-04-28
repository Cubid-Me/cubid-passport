import type { NextApiRequest, NextApiResponse } from 'next';

import { adminDappIdSchema } from '../../../../lib/server/adminSchemas';
import {
  getOwnedDapp,
  prepareAdminApiRequest,
  sendForbidden,
  sendServerError,
} from '../../../../lib/server/adminApi';

const deleteApp = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminDappIdSchema,
    rateLimitGroup: 'admin_mutation',
    route: 'admin/apps/delete',
  });

  if (!request) {
    return;
  }

  try {
    const ownedDapp = await getOwnedDapp(request.context, request.body.dappId);

    if (!ownedDapp) {
      return sendForbidden(res, 'You do not have access to that app');
    }

    const response = await request.context.supabase
      .from('dapps')
      .delete()
      .match({
        id: request.body.dappId,
        admin_uid: request.context.adminUser.uid,
      });

    if (response.error) {
      throw response.error;
    }

    return res.status(200).json({ data: { success: true } });
  } catch (error) {
    return sendServerError(res, error, 'Failed to delete app');
  }
};

export default deleteApp;
