import type { NextApiRequest, NextApiResponse } from 'next';

import {
  requireAdminUser,
  sendBadRequest,
  sendMethodNotAllowed,
  sendServerError,
} from '../../../../../lib/server/adminApi';
import {
  AdminInputError,
  archiveClientClaimPolicyBinding,
} from '../../../../../lib/server/oidcPolicyRegistry';

const archiveBinding = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST']);
  }

  const context = await requireAdminUser(req, res);

  if (!context) {
    return;
  }

  try {
    const bindingId = req.body?.bindingId;

    if (typeof bindingId !== 'string' || !bindingId.trim()) {
      return sendBadRequest(res, 'bindingId is required');
    }

    const data = await archiveClientClaimPolicyBinding(context, bindingId);

    return res.status(200).json({ data });
  } catch (error) {
    if (error instanceof AdminInputError) {
      return sendBadRequest(res, error.message);
    }

    return sendServerError(res, error, 'Failed to archive OIDC client claim policy binding');
  }
};

export default archiveBinding;