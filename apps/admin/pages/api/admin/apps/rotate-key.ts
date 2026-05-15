import type { NextApiRequest, NextApiResponse } from 'next';

import { adminDappIdSchema } from '../../../../lib/server/adminSchemas';
import {
  getOwnedDapp,
  prepareAdminApiRequest,
  sendForbidden,
  sendServerError,
} from '../../../../lib/server/adminApi';
import { rotateDappApiKey } from '../../../../lib/server/dappApiKeys';

const rotateKey = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminDappIdSchema,
    rateLimitGroup: 'admin_sensitive',
    route: 'admin/apps/rotate-key',
  });

  if (!request) {
    return;
  }

  try {
    const ownedDapp = await getOwnedDapp(request.context, request.body.dappId);

    if (!ownedDapp) {
      return sendForbidden(res, 'You do not have access to that app');
    }

    const { apiKey, keyRecord } = await rotateDappApiKey(
      request.context.supabase,
      request.body.dappId
    );
    return res.status(200).json({
      data: {
        apiKey,
        apiKeyPrefix: keyRecord.key_prefix,
        app: {
          ...ownedDapp,
          apiKeyLastUsedAt: keyRecord.last_used_at ?? null,
          apiKeyPrefix: keyRecord.key_prefix,
          apiKeyRotatedAt: keyRecord.rotated_at ?? null,
          apiKeyStatus: keyRecord.status,
        },
      },
    });
  } catch (error) {
    return sendServerError(res, error, 'Failed to rotate app key');
  }
};

export default rotateKey;
