import type { NextApiRequest, NextApiResponse } from 'next';

import { adminArchiveBindingSchema } from '../../../../../lib/server/adminSchemas';
import {
  prepareAdminApiRequest,
  sendBadRequest,
  sendServerError,
} from '../../../../../lib/server/adminApi';
import {
  AdminInputError,
  archiveClientClaimPolicyBinding,
} from '../../../../../lib/server/oidcPolicyRegistry';

const archiveBinding = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminArchiveBindingSchema,
    rateLimitGroup: 'admin_mutation',
    route: 'admin/oidc/bindings/archive',
  });

  if (!request) {
    return;
  }

  try {
    const data = await archiveClientClaimPolicyBinding(
      request.context,
      request.body.bindingId
    );

    return res.status(200).json({ data });
  } catch (error) {
    if (error instanceof AdminInputError) {
      return sendBadRequest(res, error.message);
    }

    return sendServerError(res, error, 'Failed to archive OIDC client claim policy binding');
  }
};

export default archiveBinding;
