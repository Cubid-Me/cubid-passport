import type { NextApiRequest, NextApiResponse } from 'next';

import { adminOidcClientOpsUpdateSchema } from '../../../../../lib/server/adminSchemas';
import {
  prepareAdminApiRequest,
  sendBadRequest,
  sendServerError,
} from '../../../../../lib/server/adminApi';
import {
  isOidcOpsInputError,
  normalizeClientOpsUpdateInput,
  updateOidcClientOps,
} from '../../../../../lib/server/oidcOperations';

const updateOps = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminOidcClientOpsUpdateSchema,
    rateLimitGroup: 'admin_sensitive',
    route: 'admin/oidc/clients/update-ops',
  });

  if (!request) {
    return;
  }

  try {
    const input = normalizeClientOpsUpdateInput(request.body);
    const data = await updateOidcClientOps(request.context, input);
    return res.status(200).json({ data });
  } catch (error) {
    if (isOidcOpsInputError(error)) {
      return sendBadRequest(res, error.message);
    }

    return sendServerError(res, error, 'Failed to update OIDC client operations settings');
  }
};

export default updateOps;
