import type { NextApiRequest, NextApiResponse } from 'next';

import {
  requireAdminUser,
  sendBadRequest,
  sendMethodNotAllowed,
  sendServerError,
} from '../../../../lib/server/adminApi';

const createApp = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST']);
  }

  const context = await requireAdminUser(req, res);

  if (!context) {
    return;
  }

  const { appName, pages, schemaId, url } = req.body ?? {};

  if (!appName || !schemaId || !Array.isArray(pages) || pages.length === 0) {
    return sendBadRequest(res, 'Missing app creation fields');
  }

  try {
    const appInsertResponse = await context.supabase
      .from('dapps')
      .insert({
        appname: appName,
        url,
        admin_uid: context.adminUser.uid,
      })
      .select('*')
      .maybeSingle();

    if (appInsertResponse.error || !appInsertResponse.data) {
      throw appInsertResponse.error ?? new Error('Failed to create app');
    }

    const createdApp = appInsertResponse.data;

    const schemaResponse = await context.supabase
      .from('stampscore_dapps')
      .insert({
        dapp_id: createdApp.id,
        schema_id: schemaId,
      });

    if (schemaResponse.error) {
      throw schemaResponse.error;
    }

    for (const page of pages) {
      const pageResponse = await context.supabase
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
        const stampResponse = await context.supabase
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

    return res.status(200).json({ data: createdApp });
  } catch (error) {
    return sendServerError(res, error, 'Failed to create app');
  }
};

export default createApp;
