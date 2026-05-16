import type { NextApiRequest, NextApiResponse } from 'next';

import { adminAppsCreateSchema } from '../../../../lib/server/adminSchemas';
import {
  prepareAdminApiRequest,
  sendServerError,
} from '../../../../lib/server/adminApi';
import { createDappApiKey } from '../../../../lib/server/dappApiKeys';

const omitLegacyApiKey = <T extends Record<string, unknown>>(dapp: T) => {
  const { apikey: _legacyApiKey, ...safeDapp } = dapp;
  return safeDapp;
};

const createApp = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminAppsCreateSchema,
    rateLimitGroup: 'admin_mutation',
    route: 'admin/apps/create',
  });

  if (!request) {
    return;
  }

  try {
    const { appName, pages, schemaId, url } = request.body;
    const appInsertResponse = await request.context.supabase
      .from('dapps')
      .insert({
        appname: appName,
        url,
        admin_uid: request.context.adminUser.uid,
      })
      .select('*')
      .maybeSingle();

    if (appInsertResponse.error || !appInsertResponse.data) {
      throw appInsertResponse.error ?? new Error('Failed to create app');
    }

    const createdApp = appInsertResponse.data;
    const { apiKey, keyRecord } = await createDappApiKey(
      request.context.supabase,
      createdApp.id
    );

    const schemaResponse = await request.context.supabase
      .from('stampscore_dapps')
      .insert({
        dapp_id: createdApp.id,
        schema_id: schemaId,
      });

    if (schemaResponse.error) {
      throw schemaResponse.error;
    }

    for (const page of pages) {
      const pageResponse = await request.context.supabase
        .from('dapp_pages')
        .insert({
          page_name: page.pageName,
          redirect_url: page.redirectUrl,
          dapp_id: createdApp.id,
        })
        .select('*')
        .maybeSingle();

      if (pageResponse.error || !pageResponse.data) {
        throw pageResponse.error ?? new Error('Failed to create app page');
      }

      const stampConfigs = Array.isArray(page.stampConfigs)
        ? page.stampConfigs
        : [];

      for (const stampConfig of stampConfigs) {
        const stampResponse = await request.context.supabase
          .from('dapp_stamptypes')
          .insert({
            dapp_id: createdApp.id,
            page_id: pageResponse.data.id,
            stamptype_id: stampConfig.stampTypeId,
            is_auth_enabled: stampConfig.auth,
            include_in_score: stampConfig.score,
            is_infosharing_required: stampConfig.required,
            info_sharing_type_id: stampConfig.infoSharingTypeId,
          });

        if (stampResponse.error) {
          throw stampResponse.error;
        }
      }
    }

    return res.status(200).json({
      data: {
        apiKey,
        apiKeyPrefix: keyRecord.key_prefix,
        app: {
          ...omitLegacyApiKey(createdApp),
          apiKeyLastUsedAt: keyRecord.last_used_at ?? null,
          apiKeyPrefix: keyRecord.key_prefix,
          apiKeyRotatedAt: keyRecord.rotated_at ?? null,
          apiKeyStatus: keyRecord.status,
        },
      },
    });
  } catch (error) {
    return sendServerError(res, error, 'Failed to create app');
  }
};

export default createApp;
