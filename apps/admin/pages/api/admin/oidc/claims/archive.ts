import type { NextApiRequest, NextApiResponse } from 'next';

import {
  requireAdminUser,
  sendBadRequest,
  sendMethodNotAllowed,
  sendServerError,
} from '../../../../../lib/server/adminApi';
import {
  AdminInputError,
  archiveClaimRegistryRecord,
} from '../../../../../lib/server/oidcPolicyRegistry';

const archiveClaim = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST']);
  }

  const context = await requireAdminUser(req, res);

  if (!context) {
    return;
  }

  try {
    const claimId = req.body?.claimId;

    if (typeof claimId !== 'string' || !claimId.trim()) {
      return sendBadRequest(res, 'claimId is required');
    }

    const data = await archiveClaimRegistryRecord(context, claimId);

    return res.status(200).json({ data });
  } catch (error) {
    if (error instanceof AdminInputError) {
      return sendBadRequest(res, error.message);
    }

    return sendServerError(res, error, 'Failed to archive OIDC claim registry record');
  }
};

export default archiveClaim;