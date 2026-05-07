import type { NextApiRequest, NextApiResponse } from 'next';

import { adminIncludeArchivedSchema } from '../../../../../lib/server/adminSchemas';
import {
  prepareAdminApiRequest,
  sendServerError,
} from '../../../../../lib/server/adminApi';
import { listIdentityDepthPolicies } from '../../../../../lib/server/oidcPolicyRegistry';

const listPolicies = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminIncludeArchivedSchema,
    rateLimitGroup: 'admin_read',
    route: 'admin/oidc/policies/list',
  });

  if (!request) {
    return;
  }

  try {
    const data = await listIdentityDepthPolicies(request.context.supabase, {
      includeArchived: request.body.includeArchived === true,
    });

    return res.status(200).json({ data });
  } catch (error) {
    return sendServerError(res, error, 'Failed to load OIDC identity depth policies');
  }
};

export default listPolicies;
