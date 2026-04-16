import type { NextApiRequest, NextApiResponse } from 'next';

import {
  requireAdminUser,
  sendMethodNotAllowed,
  sendServerError,
} from '../../../../lib/server/adminApi';
import {
  OIDC_ADMIN_METADATA,
  listClaimRegistry,
  listIdentityDepthPolicies,
  listOidcClients,
} from '../../../../lib/server/oidcPolicyRegistry';

const oidcMetadata = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST']);
  }

  const context = await requireAdminUser(req, res);

  if (!context) {
    return;
  }

  try {
    const [clients, claims, policies] = await Promise.all([
      listOidcClients(context.supabase),
      listClaimRegistry(context.supabase),
      listIdentityDepthPolicies(context.supabase),
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