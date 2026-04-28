import type { NextApiRequest, NextApiResponse } from 'next';

import { adminDappIdSchema } from '../../../../lib/server/adminSchemas';
import {
  getOwnedDapp,
  prepareAdminApiRequest,
  sendForbidden,
  sendServerError,
} from '../../../../lib/server/adminApi';

const appConfig = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminDappIdSchema,
    rateLimitGroup: 'admin_read',
    route: 'admin/apps/config',
  });

  if (!request) {
    return;
  }

  try {
    const ownedDapp = await getOwnedDapp(request.context, request.body.dappId);

    if (!ownedDapp) {
      return sendForbidden(res, 'You do not have access to that app');
    }

    const [stampScoreResponse, dappStampTypesResponse] = await Promise.all([
      request.context.supabase
        .from('stampscore_dapps')
        .select('*')
        .match({ dapp_id: request.body.dappId })
        .maybeSingle(),
      request.context.supabase
        .from('dapp_stamptypes')
        .select('*')
        .match({ dapp_id: request.body.dappId }),
    ]);

    if (stampScoreResponse.error) {
      throw stampScoreResponse.error;
    }

    if (dappStampTypesResponse.error) {
      throw dappStampTypesResponse.error;
    }

    return res.status(200).json({
      data: {
        stampScore: stampScoreResponse.data,
        dappStampTypes: dappStampTypesResponse.data ?? [],
      },
    });
  } catch (error) {
    return sendServerError(res, error, 'Failed to load app config');
  }
};

export default appConfig;
