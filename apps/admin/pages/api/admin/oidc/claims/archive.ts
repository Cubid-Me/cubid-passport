import type { NextApiRequest, NextApiResponse } from 'next';

import { adminArchiveClaimSchema } from '../../../../../lib/server/adminSchemas';
import {
  prepareAdminApiRequest,
  sendBadRequest,
  sendServerError,
} from '../../../../../lib/server/adminApi';
import {
  AdminInputError,
  archiveClaimRegistryRecord,
} from '../../../../../lib/server/oidcPolicyRegistry';

const archiveClaim = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminArchiveClaimSchema,
    rateLimitGroup: 'admin_mutation',
    route: 'admin/oidc/claims/archive',
  });

  if (!request) {
    return;
  }

  try {
    const data = await archiveClaimRegistryRecord(
      request.context,
      request.body.claimId
    );

    return res.status(200).json({ data });
  } catch (error) {
    if (error instanceof AdminInputError) {
      return sendBadRequest(res, error.message);
    }

    return sendServerError(res, error, 'Failed to archive OIDC claim registry record');
  }
};

export default archiveClaim;
