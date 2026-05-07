import type { NextApiRequest, NextApiResponse } from 'next';

import { adminIncludeArchivedSchema } from '../../../../../lib/server/adminSchemas';
import {
  prepareAdminApiRequest,
  sendServerError,
} from '../../../../../lib/server/adminApi';
import { listClaimRegistry } from '../../../../../lib/server/oidcPolicyRegistry';

const listClaims = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminIncludeArchivedSchema,
    rateLimitGroup: 'admin_read',
    route: 'admin/oidc/claims/list',
  });

  if (!request) {
    return;
  }

  try {
    const data = await listClaimRegistry(request.context.supabase, {
      includeArchived: request.body.includeArchived === true,
    });

    return res.status(200).json({ data });
  } catch (error) {
    return sendServerError(res, error, 'Failed to load OIDC claim registry');
  }
};

export default listClaims;
