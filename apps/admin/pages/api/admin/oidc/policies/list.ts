import type { NextApiRequest, NextApiResponse } from 'next';

import {
  requireAdminUser,
  sendMethodNotAllowed,
  sendServerError,
} from '../../../../../lib/server/adminApi';
import { listIdentityDepthPolicies } from '../../../../../lib/server/oidcPolicyRegistry';

const listPolicies = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST']);
  }

  const context = await requireAdminUser(req, res);

  if (!context) {
    return;
  }

  try {
    const includeArchived = req.body?.includeArchived === true;
    const data = await listIdentityDepthPolicies(context.supabase, {
      includeArchived,
    });

    return res.status(200).json({ data });
  } catch (error) {
    return sendServerError(res, error, 'Failed to load OIDC identity depth policies');
  }
};

export default listPolicies;