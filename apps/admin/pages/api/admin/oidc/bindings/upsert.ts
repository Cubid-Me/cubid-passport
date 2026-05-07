import type { NextApiRequest, NextApiResponse } from 'next';

import { adminOidcBindingUpsertSchema } from '../../../../../lib/server/adminSchemas';
import {
  prepareAdminApiRequest,
  sendBadRequest,
  sendServerError,
} from '../../../../../lib/server/adminApi';
import {
  AdminInputError,
  upsertClientClaimPolicyBinding,
} from '../../../../../lib/server/oidcPolicyRegistry';

const upsertBinding = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminOidcBindingUpsertSchema,
    rateLimitGroup: 'admin_mutation',
    route: 'admin/oidc/bindings/upsert',
  });

  if (!request) {
    return;
  }

  try {
    const data = await upsertClientClaimPolicyBinding(
      request.context,
      request.body as Parameters<typeof upsertClientClaimPolicyBinding>[1]
    );

    return res.status(200).json({ data });
  } catch (error) {
    if (error instanceof AdminInputError) {
      return sendBadRequest(res, error.message);
    }

    return sendServerError(res, error, 'Failed to save OIDC client claim policy binding');
  }
};

export default upsertBinding;
