import { randomUUID } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

import { adminDappIdSchema } from '../../../../lib/server/adminSchemas';
import {
  getOwnedDapp,
  prepareAdminApiRequest,
  sendForbidden,
  sendServerError,
} from '../../../../lib/server/adminApi';

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

    const response = await request.context.supabase
      .from('dapps')
      .update({
        apikey: randomUUID(),
      })
      .match({
        id: request.body.dappId,
        admin_uid: request.context.adminUser.uid,
      })
      .select('*')
      .maybeSingle();

    if (response.error) {
      throw response.error;
    }

    return res.status(200).json({ data: response.data });
  } catch (error) {
    return sendServerError(res, error, 'Failed to rotate app key');
  }
};

export default rotateKey;
