import type { NextApiRequest, NextApiResponse } from 'next';

import { adminPagesUpdateSchema } from '../../../../lib/server/adminSchemas';
import {
  getOwnedDapp,
  prepareAdminApiRequest,
  sendForbidden,
  sendServerError,
} from '../../../../lib/server/adminApi';

const updatePages = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminPagesUpdateSchema,
    rateLimitGroup: 'admin_mutation',
    route: 'admin/pages/update',
  });

  if (!request) {
    return;
  }

  try {
    const { dappId, pages } = request.body;
    const ownedDapp = await getOwnedDapp(request.context, dappId);

    if (!ownedDapp) {
      return sendForbidden(res, 'You do not have access to that app');
    }

    for (const page of pages) {
      const numericPageId = page.pageId;
      const pageUpdateResponse = await request.context.supabase
        .from('dapp_pages')
        .update({
          page_name: page.pageName,
          redirect_url: page.redirectUrl,
          dapp_id: dappId,
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

        const updateResponse = await request.context.supabase
          .from('dapp_stamptypes')
          .update({
            dapp_id: dappId,
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
          const insertResponse = await request.context.supabase
            .from('dapp_stamptypes')
            .insert({
              dapp_id: dappId,
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
