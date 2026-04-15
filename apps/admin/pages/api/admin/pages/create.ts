import type { NextApiRequest, NextApiResponse } from 'next';

import {
  getOwnedDapp,
  requireAdminUser,
  sendBadRequest,
  sendForbidden,
  sendMethodNotAllowed,
  sendServerError,
} from '../../../../lib/server/adminApi';

const createPages = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST']);
  }

  const context = await requireAdminUser(req, res);

  if (!context) {
    return;
  }

  const numericDappId = Number(req.body?.dappId);
  const pages = req.body?.pages;

  if (!numericDappId || !Array.isArray(pages) || pages.length === 0) {
    return sendBadRequest(res, 'Missing page creation fields');
  }

  try {
    const ownedDapp = await getOwnedDapp(context, numericDappId);

    if (!ownedDapp) {
      return sendForbidden(res, 'You do not have access to that app');
    }

    for (const page of pages) {
      const pageResponse = await context.supabase
        .from('dapp_pages')
        .insert({
          page_name: page.pageName,
          redirect_url: page.redirectUrl,
          dapp_id: numericDappId,
        })
        .select('*')
        .maybeSingle();

      if (pageResponse.error || !pageResponse.data) {
        throw pageResponse.error ?? new Error('Failed to create page');
      }

      for (const stampConfig of Array.isArray(page.stampConfigs)
        ? page.stampConfigs
        : []) {
        if (stampConfig.infoSharingTypeId === 1) {
          continue;
        }

        const stampResponse = await context.supabase
          .from('dapp_stamptypes')
          .insert({
            dapp_id: numericDappId,
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

    return res.status(200).json({ data: { success: true } });
  } catch (error) {
    return sendServerError(res, error, 'Failed to create pages');
  }
};

export default createPages;
