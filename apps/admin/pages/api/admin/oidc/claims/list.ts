import type { NextApiRequest, NextApiResponse } from 'next';

import {
  requireAdminUser,
  sendMethodNotAllowed,
  sendServerError,
} from '../../../../../lib/server/adminApi';
import { listClaimRegistry } from '../../../../../lib/server/oidcPolicyRegistry';

const listClaims = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST']);
  }

  const context = await requireAdminUser(req, res);

  if (!context) {
    return;
  }

  try {
    const includeArchived = req.body?.includeArchived === true;
    const data = await listClaimRegistry(context.supabase, { includeArchived });

    return res.status(200).json({ data });
  } catch (error) {
    return sendServerError(res, error, 'Failed to load OIDC claim registry');
  }
};

export default listClaims;