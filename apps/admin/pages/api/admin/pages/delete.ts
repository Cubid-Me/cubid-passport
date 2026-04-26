import type { NextApiRequest, NextApiResponse } from 'next';

import { adminPageIdSchema } from '../../../../lib/server/adminSchemas';
import {
  getOwnedPage,
  prepareAdminApiRequest,
  sendForbidden,
  sendServerError,
} from '../../../../lib/server/adminApi';

const deletePage = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminPageIdSchema,
    rateLimitGroup: 'admin_mutation',
    route: 'admin/pages/delete',
  });

  if (!request) {
    return;
  }

  try {
    const ownedPage = await getOwnedPage(request.context, request.body.pageId);

    if (!ownedPage) {
      return sendForbidden(res, 'You do not have access to that page');
    }

    const response = await request.context.supabase
      .from('dapp_pages')
      .delete()
      .match({ id: request.body.pageId });

    if (response.error) {
      throw response.error;
    }

    return res.status(200).json({ data: { success: true } });
  } catch (error) {
    return sendServerError(res, error, 'Failed to delete page');
  }
};

export default deletePage;
