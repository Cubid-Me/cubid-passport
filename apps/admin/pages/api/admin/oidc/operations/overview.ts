import type { NextApiRequest, NextApiResponse } from 'next';

import { adminNoBodySchema } from '../../../../../lib/server/adminSchemas';
import {
  prepareAdminApiRequest,
  sendServerError,
} from '../../../../../lib/server/adminApi';
import { loadOidcOpsOverview } from '../../../../../lib/server/oidcOperations';

const overview = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminNoBodySchema,
    rateLimitGroup: 'admin_read',
    route: 'admin/oidc/operations/overview',
  });

  if (!request) {
    return;
  }

  try {
    const data = await loadOidcOpsOverview(request.context.supabase);
    return res.status(200).json({ data });
  } catch (error) {
    return sendServerError(res, error, 'Failed to load OIDC operations overview');
  }
};

export default overview;
