import type { NextApiRequest, NextApiResponse } from 'next';

import { adminOidcClaimUpsertSchema } from '../../../../../lib/server/adminSchemas';
import {
  prepareAdminApiRequest,
  sendBadRequest,
  sendServerError,
} from '../../../../../lib/server/adminApi';
import {
  AdminInputError,
  upsertClaimRegistryRecord,
} from '../../../../../lib/server/oidcPolicyRegistry';

const upsertClaim = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminOidcClaimUpsertSchema,
    rateLimitGroup: 'admin_mutation',
    route: 'admin/oidc/claims/upsert',
  });

  if (!request) {
    return;
  }

  try {
    const data = await upsertClaimRegistryRecord(
      request.context,
      request.body as Parameters<typeof upsertClaimRegistryRecord>[1]
    );

    return res.status(200).json({ data });
  } catch (error) {
    if (error instanceof AdminInputError) {
      return sendBadRequest(res, error.message);
    }

    return sendServerError(res, error, 'Failed to save OIDC claim registry record');
  }
};

export default upsertClaim;
