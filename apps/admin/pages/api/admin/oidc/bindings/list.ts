import type { NextApiRequest, NextApiResponse } from 'next';

import { adminIncludeArchivedSchema } from '../../../../../lib/server/adminSchemas';
import {
  prepareAdminApiRequest,
  sendServerError,
} from '../../../../../lib/server/adminApi';
import { listClientClaimPolicyBindings } from '../../../../../lib/server/oidcPolicyRegistry';

const listBindings = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminIncludeArchivedSchema,
    rateLimitGroup: 'admin_read',
    route: 'admin/oidc/bindings/list',
  });

  if (!request) {
    return;
  }

  try {
    const data = await listClientClaimPolicyBindings(request.context.supabase, {
      includeArchived: request.body.includeArchived === true,
    });

    return res.status(200).json({ data });
  } catch (error) {
    return sendServerError(res, error, 'Failed to load OIDC client claim policy bindings');
  }
};

export default listBindings;
