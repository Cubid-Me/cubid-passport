import type { NextApiRequest, NextApiResponse } from 'next';

import { adminDappIdSchema } from '../../../../lib/server/adminSchemas';
import {
  getOwnedDapp,
  prepareAdminApiRequest,
  sendForbidden,
  sendServerError,
} from '../../../../lib/server/adminApi';

const listPages = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminDappIdSchema,
    rateLimitGroup: 'admin_read',
    route: 'admin/pages/list',
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
      .from('dapp_pages')
      .select('*')
      .match({ dapp_id: request.body.dappId });

    if (response.error) {
      throw response.error;
    }

    return res.status(200).json({ data: response.data ?? [] });
  } catch (error) {
    return sendServerError(res, error, 'Failed to load pages');
  }
};

export default listPages;
