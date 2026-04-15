import type { NextApiRequest, NextApiResponse } from 'next';

import {
  getOwnedDapp,
  requireAdminUser,
  sendBadRequest,
  sendForbidden,
  sendMethodNotAllowed,
  sendServerError,
} from '../../../../lib/server/adminApi';

const updateApp = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST']);
  }

  const context = await requireAdminUser(req, res);

  if (!context) {
    return;
  }

  const { appName, dappId, redirectUrl, schemaId, stampConfigs, url } =
    req.body ?? {};
  const numericDappId = Number(dappId);

  if (!numericDappId || !appName || !schemaId) {
    return sendBadRequest(res, 'Missing app update fields');
  }

  try {
    const ownedDapp = await getOwnedDapp(context, numericDappId);

    if (!ownedDapp) {
      return sendForbidden(res, 'You do not have access to that app');
    }

    const appResponse = await context.supabase
      .from('dapps')
      .update({
        appname: appName,
        url,
        redirect_url: redirectUrl,
        admin_uid: context.adminUser.uid,
      })
      .match({ id: numericDappId })
      .select('*')
      .maybeSingle();

    if (appResponse.error) {
      throw appResponse.error;
    }

    const existingStampScoreResponse = await context.supabase
      .from('stampscore_dapps')
      .select('*')
      .match({ dapp_id: numericDappId })
      .maybeSingle();

    if (existingStampScoreResponse.error) {
      throw existingStampScoreResponse.error;
    }

    if (existingStampScoreResponse.data) {
      const stampScoreUpdateResponse = await context.supabase
        .from('stampscore_dapps')
        .update({ schema_id: schemaId })
        .match({ dapp_id: numericDappId });

      if (stampScoreUpdateResponse.error) {
        throw stampScoreUpdateResponse.error;
      }
    } else {
      const stampScoreInsertResponse = await context.supabase
        .from('stampscore_dapps')
        .insert({ dapp_id: numericDappId, schema_id: schemaId });

      if (stampScoreInsertResponse.error) {
        throw stampScoreInsertResponse.error;
      }
    }

    for (const stampConfig of Array.isArray(stampConfigs) ? stampConfigs : []) {
      const stampUpdateResponse = await context.supabase
        .from('dapp_stamptypes')
        .update({
          dapp_id: numericDappId,
          stamptype_id: stampConfig.stampTypeId,
          is_auth_enabled: stampConfig.auth,
          include_in_score: stampConfig.score,
          is_infosharing_required: stampConfig.required,
          info_sharing_type_id: stampConfig.infoSharingTypeId,
        })
        .match({
          dapp_id: numericDappId,
          stamptype_id: stampConfig.stampTypeId,
        });

      if (stampUpdateResponse.error) {
        throw stampUpdateResponse.error;
      }
    }

    return res.status(200).json({ data: appResponse.data ?? ownedDapp });
  } catch (error) {
    return sendServerError(res, error, 'Failed to update app');
  }
};

export default updateApp;
