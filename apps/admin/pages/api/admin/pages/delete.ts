import type { NextApiRequest, NextApiResponse } from 'next';

import {
  getOwnedPage,
  requireAdminUser,
  sendBadRequest,
  sendForbidden,
  sendMethodNotAllowed,
  sendServerError,
} from '../../../../lib/server/adminApi';

const deletePage = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST']);
  }

  const context = await requireAdminUser(req, res);

  if (!context) {
    return;
  }

  const numericPageId = Number(req.body?.pageId);

  if (!numericPageId) {
    return sendBadRequest(res, 'Missing pageId');
  }

  try {
    const ownedPage = await getOwnedPage(context, numericPageId);

    if (!ownedPage) {
      return sendForbidden(res, 'You do not have access to that page');
    }

    const response = await context.supabase
      .from('dapp_pages')
      .delete()
      .match({ id: numericPageId });

    if (response.error) {
      throw response.error;
    }

    return res.status(200).json({ data: { success: true } });
  } catch (error) {
    return sendServerError(res, error, 'Failed to delete page');
  }
};

export default deletePage;
