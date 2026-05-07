import type { NextApiRequest, NextApiResponse } from 'next';

import { adminOidcPolicyUpsertSchema } from '../../../../../lib/server/adminSchemas';
import {
  prepareAdminApiRequest,
  sendBadRequest,
  sendServerError,
} from '../../../../../lib/server/adminApi';
import {
  AdminInputError,
  upsertIdentityDepthPolicy,
} from '../../../../../lib/server/oidcPolicyRegistry';

const upsertPolicy = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminOidcPolicyUpsertSchema,
    rateLimitGroup: 'admin_mutation',
    route: 'admin/oidc/policies/upsert',
  });

  if (!request) {
    return;
  }

  try {
    const data = await upsertIdentityDepthPolicy(
      request.context,
      request.body as Parameters<typeof upsertIdentityDepthPolicy>[1]
    );

    return res.status(200).json({ data });
  } catch (error) {
    if (error instanceof AdminInputError) {
      return sendBadRequest(res, error.message);
    }

    return sendServerError(res, error, 'Failed to save OIDC identity depth policy');
  }
};

export default upsertPolicy;
