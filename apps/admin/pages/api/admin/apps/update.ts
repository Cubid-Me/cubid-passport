import type { NextApiRequest, NextApiResponse } from 'next';

import { adminAppsUpdateSchema } from '../../../../lib/server/adminSchemas';
import {
  getOwnedDapp,
  prepareAdminApiRequest,
  sendForbidden,
  sendServerError,
} from '../../../../lib/server/adminApi';

const updateApp = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminAppsUpdateSchema,
    rateLimitGroup: 'admin_mutation',
    route: 'admin/apps/update',
  });

  if (!request) {
    return;
  }

  try {
    const { appName, dappId, redirectUrl, schemaId, stampConfigs, url } =
      request.body;
    const ownedDapp = await getOwnedDapp(request.context, dappId);

    if (!ownedDapp) {
      return sendForbidden(res, 'You do not have access to that app');
    }

    const appResponse = await request.context.supabase
      .from('dapps')
      .update({
        appname: appName,
        url,
        redirect_url: redirectUrl,
        admin_uid: request.context.adminUser.uid,
      })
      .match({ id: dappId })
      .select('*')
      .maybeSingle();

    if (appResponse.error) {
      throw appResponse.error;
    }

    const existingStampScoreResponse = await request.context.supabase
      .from('stampscore_dapps')
      .select('*')
      .match({ dapp_id: dappId })
      .maybeSingle();

    if (existingStampScoreResponse.error) {
      throw existingStampScoreResponse.error;
    }

    if (existingStampScoreResponse.data) {
      const stampScoreUpdateResponse = await request.context.supabase
        .from('stampscore_dapps')
        .update({ schema_id: schemaId })
        .match({ dapp_id: dappId });

      if (stampScoreUpdateResponse.error) {
        throw stampScoreUpdateResponse.error;
      }
    } else {
      const stampScoreInsertResponse = await request.context.supabase
        .from('stampscore_dapps')
        .insert({ dapp_id: dappId, schema_id: schemaId });

      if (stampScoreInsertResponse.error) {
        throw stampScoreInsertResponse.error;
      }
    }

    for (const stampConfig of Array.isArray(stampConfigs) ? stampConfigs : []) {
      const stampUpdateResponse = await request.context.supabase
        .from('dapp_stamptypes')
        .update({
          dapp_id: dappId,
          stamptype_id: stampConfig.stampTypeId,
          is_auth_enabled: stampConfig.auth,
          include_in_score: stampConfig.score,
          is_infosharing_required: stampConfig.required,
          info_sharing_type_id: stampConfig.infoSharingTypeId,
        })
        .match({
          dapp_id: dappId,
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
