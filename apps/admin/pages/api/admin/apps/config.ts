import type { NextApiRequest, NextApiResponse } from 'next';

import {
  getOwnedDapp,
  requireAdminUser,
  sendBadRequest,
  sendForbidden,
  sendMethodNotAllowed,
  sendServerError,
} from '../../../../lib/server/adminApi';

const appConfig = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST']);
  }

  const context = await requireAdminUser(req, res);

  if (!context) {
    return;
  }

  const dappId = Number(req.body?.dappId);

  if (!dappId) {
    return sendBadRequest(res, 'Missing dappId');
  }

  try {
    const ownedDapp = await getOwnedDapp(context, dappId);

    if (!ownedDapp) {
      return sendForbidden(res, 'You do not have access to that app');
    }

    const [stampScoreResponse, dappStampTypesResponse] = await Promise.all([
      context.supabase
        .from('stampscore_dapps')
        .select('*')
        .match({ dapp_id: dappId })
        .maybeSingle(),
      context.supabase
        .from('dapp_stamptypes')
        .select('*')
        .match({ dapp_id: dappId }),
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
