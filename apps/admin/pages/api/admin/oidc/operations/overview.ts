import type { NextApiRequest, NextApiResponse } from 'next';

import {
  requireAdminUser,
  sendMethodNotAllowed,
  sendServerError,
} from '../../../../../lib/server/adminApi';
import { loadOidcOpsOverview } from '../../../../../lib/server/oidcOperations';

const overview = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST']);
  }

  const context = await requireAdminUser(req, res);

  if (!context) {
    return;
  }

  try {
    const data = await loadOidcOpsOverview(context.supabase);
    return res.status(200).json({ data });
  } catch (error) {
    return sendServerError(res, error, 'Failed to load OIDC operations overview');
  }
};

export default overview;
