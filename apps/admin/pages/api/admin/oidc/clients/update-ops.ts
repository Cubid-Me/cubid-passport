import type { NextApiRequest, NextApiResponse } from 'next';

import {
  requireAdminUser,
  sendBadRequest,
  sendMethodNotAllowed,
  sendServerError,
} from '../../../../../lib/server/adminApi';
import {
  isOidcOpsInputError,
  normalizeClientOpsUpdateInput,
  updateOidcClientOps,
} from '../../../../../lib/server/oidcOperations';

const updateOps = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST']);
  }

  const context = await requireAdminUser(req, res);

  if (!context) {
    return;
  }

  try {
    const input = normalizeClientOpsUpdateInput(req.body);
    const data = await updateOidcClientOps(context, input);
    return res.status(200).json({ data });
  } catch (error) {
    if (isOidcOpsInputError(error)) {
      return sendBadRequest(res, error.message);
    }

    return sendServerError(res, error, 'Failed to update OIDC client operations settings');
  }
};

export default updateOps;
