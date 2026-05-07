import type { NextApiRequest, NextApiResponse } from 'next';

import { adminArchivePolicySchema } from '../../../../../lib/server/adminSchemas';
import {
  prepareAdminApiRequest,
  sendBadRequest,
  sendServerError,
} from '../../../../../lib/server/adminApi';
import {
  AdminInputError,
  archiveIdentityDepthPolicy,
} from '../../../../../lib/server/oidcPolicyRegistry';

const archivePolicy = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminArchivePolicySchema,
    rateLimitGroup: 'admin_mutation',
    route: 'admin/oidc/policies/archive',
  });

  if (!request) {
    return;
  }

  try {
    const data = await archiveIdentityDepthPolicy(
      request.context,
      request.body.policyId
    );

    return res.status(200).json({ data });
  } catch (error) {
    if (error instanceof AdminInputError) {
      return sendBadRequest(res, error.message);
    }

    return sendServerError(res, error, 'Failed to archive OIDC identity depth policy');
  }
};

export default archivePolicy;
