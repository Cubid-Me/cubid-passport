import type { NextApiRequest, NextApiResponse } from 'next';

import {
  requireAdminUser,
  sendBadRequest,
  sendMethodNotAllowed,
  sendServerError,
} from '../../../../../lib/server/adminApi';
import {
  AdminInputError,
  upsertClientClaimPolicyBinding,
} from '../../../../../lib/server/oidcPolicyRegistry';

const upsertBinding = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST']);
  }

  const context = await requireAdminUser(req, res);

  if (!context) {
    return;
  }

  try {
    const data = await upsertClientClaimPolicyBinding(context, req.body ?? {});

    return res.status(200).json({ data });
  } catch (error) {
    if (error instanceof AdminInputError) {
      return sendBadRequest(res, error.message);
    }

    return sendServerError(res, error, 'Failed to save OIDC client claim policy binding');
  }
};

export default upsertBinding;