import type { NextApiRequest, NextApiResponse } from 'next';

import { adminNoBodySchema } from '../../../../lib/server/adminSchemas';
import {
  prepareAdminApiRequest,
  sendServerError,
} from '../../../../lib/server/adminApi';
import {
  OIDC_ADMIN_METADATA,
  listClaimRegistry,
  listIdentityDepthPolicies,
  listOidcClients,
} from '../../../../lib/server/oidcPolicyRegistry';

const oidcMetadata = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminNoBodySchema,
    rateLimitGroup: 'admin_read',
    route: 'admin/oidc/metadata',
  });

  if (!request) {
    return;
  }

  try {
    const [clients, claims, policies] = await Promise.all([
      listOidcClients(request.context.supabase),
      listClaimRegistry(request.context.supabase),
      listIdentityDepthPolicies(request.context.supabase),
    ]);

    return res.status(200).json({
      data: {
        clients,
        claims,
        metadata: OIDC_ADMIN_METADATA,
        policies,
      },
    });
  } catch (error) {
    return sendServerError(res, error, 'Failed to load OIDC admin metadata');
  }
};

export default oidcMetadata;
