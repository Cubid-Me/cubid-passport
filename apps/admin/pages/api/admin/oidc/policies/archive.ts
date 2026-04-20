import type { NextApiRequest, NextApiResponse } from 'next';

import {
  requireAdminUser,
  sendBadRequest,
  sendMethodNotAllowed,
  sendServerError,
} from '../../../../../lib/server/adminApi';
import {
  AdminInputError,
  archiveIdentityDepthPolicy,
} from '../../../../../lib/server/oidcPolicyRegistry';

const archivePolicy = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST']);
  }

  const context = await requireAdminUser(req, res);

  if (!context) {
    return;
  }

  try {
    const policyId = req.body?.policyId;

    if (typeof policyId !== 'string' || !policyId.trim()) {
      return sendBadRequest(res, 'policyId is required');
    }

    const data = await archiveIdentityDepthPolicy(context, policyId);

    return res.status(200).json({ data });
  } catch (error) {
    if (error instanceof AdminInputError) {
      return sendBadRequest(res, error.message);
    }

    return sendServerError(res, error, 'Failed to archive OIDC identity depth policy');
  }
};

export default archivePolicy;