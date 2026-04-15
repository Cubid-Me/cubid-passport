import type { NextApiRequest, NextApiResponse } from 'next';

import {
  getOwnedDapp,
  requireAdminUser,
  sendBadRequest,
  sendForbidden,
  sendMethodNotAllowed,
  sendServerError,
} from '../../../../lib/server/adminApi';

const updatePages = async (req: NextApiRequest, res: NextApiResponse) => {
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
    return sendBadRequest(res, 'Missing page update fields');
  }

  try {
    const ownedDapp = await getOwnedDapp(context, numericDappId);

    if (!ownedDapp) {
      return sendForbidden(res, 'You do not have access to that app');
    }

    for (const page of pages) {
      const numericPageId = Number(page.pageId);

      if (!numericPageId) {
        throw new Error('Missing page id in update payload');
      }

      const pageUpdateResponse = await context.supabase
        .from('dapp_pages')
        .update({
          page_name: page.pageName,
          redirect_url: page.redirectUrl,
          dapp_id: numericDappId,
        })
        .match({ id: numericPageId });

      if (pageUpdateResponse.error) {
        throw pageUpdateResponse.error;
      }

      for (const stampConfig of Array.isArray(page.stampConfigs)
        ? page.stampConfigs
        : []) {
        if (stampConfig.infoSharingTypeId === 1) {
          continue;
        }

        const updateResponse = await context.supabase
          .from('dapp_stamptypes')
          .update({
            dapp_id: numericDappId,
            page_id: numericPageId,
            stamptype_id: stampConfig.stampTypeId,
            is_auth_enabled: stampConfig.auth,
            include_in_score: stampConfig.score,
            is_infosharing_required: stampConfig.required,
            info_sharing_type_id: stampConfig.infoSharingTypeId,
          })
          .match({
            page_id: numericPageId,
            stamptype_id: stampConfig.stampTypeId,
          })
          .select('*');

        if (updateResponse.error) {
          throw updateResponse.error;
        }

        if ((updateResponse.data ?? []).length === 0) {
          const insertResponse = await context.supabase
            .from('dapp_stamptypes')
            .insert({
              dapp_id: numericDappId,
              page_id: numericPageId,
              stamptype_id: stampConfig.stampTypeId,
              is_auth_enabled: stampConfig.auth,
              include_in_score: stampConfig.score,
              is_infosharing_required: stampConfig.required,
              info_sharing_type_id: stampConfig.infoSharingTypeId,
            });

          if (insertResponse.error) {
            throw insertResponse.error;
          }
        }
      }
    }

    return res.status(200).json({ data: { success: true } });
  } catch (error) {
    return sendServerError(res, error, 'Failed to update pages');
  }
};

export default updatePages;
