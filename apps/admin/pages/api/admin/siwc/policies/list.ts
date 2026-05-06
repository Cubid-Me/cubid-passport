import type { NextApiRequest, NextApiResponse } from 'next';

import { adminSiwcPolicyListSchema } from '../../../../../lib/server/adminSchemas';
import {
  prepareAdminApiRequest,
  sendServerError,
} from '../../../../../lib/server/adminApi';
import { listSiwcPolicies } from '../../../../../lib/server/siwcPolicies';

const list = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminSiwcPolicyListSchema,
    rateLimitGroup: 'admin_read',
    route: 'admin/siwc/policies/list',
  });

  if (!request) {
    return;
  }

  try {
    const data = await listSiwcPolicies(request.context);
    return res.status(200).json({ data });
  } catch (error) {
    return sendServerError(res, error, 'Failed to load SIWC policies');
  }
};

export default list;
