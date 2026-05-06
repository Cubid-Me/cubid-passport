import type { NextApiRequest, NextApiResponse } from 'next';

import { adminSiwcPolicyUpsertSchema } from '../../../../../lib/server/adminSchemas';
import {
  prepareAdminApiRequest,
  sendBadRequest,
  sendServerError,
} from '../../../../../lib/server/adminApi';
import {
  isSiwcPolicyInputError,
  upsertSiwcPolicy,
} from '../../../../../lib/server/siwcPolicies';

const upsert = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminSiwcPolicyUpsertSchema,
    rateLimitGroup: 'admin_sensitive',
    route: 'admin/siwc/policies/upsert',
  });

  if (!request) {
    return;
  }

  try {
    const policy = await upsertSiwcPolicy(request.context, request.body);
    return res.status(200).json({ data: { policy } });
  } catch (error) {
    if (isSiwcPolicyInputError(error)) {
      return sendBadRequest(res, error.message);
    }

    return sendServerError(res, error, 'Failed to save SIWC policy');
  }
};

export default upsert;
