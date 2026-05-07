import type { NextApiRequest, NextApiResponse } from 'next';

import { adminPagesCreateSchema } from '../../../../lib/server/adminSchemas';
import {
  getOwnedDapp,
  prepareAdminApiRequest,
  sendForbidden,
  sendServerError,
} from '../../../../lib/server/adminApi';

const createPages = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminPagesCreateSchema,
    rateLimitGroup: 'admin_mutation',
    route: 'admin/pages/create',
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
      const pageResponse = await request.context.supabase
        .from('dapp_pages')
        .insert({
          page_name: page.pageName,
          redirect_url: page.redirectUrl,
          dapp_id: dappId,
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

        const stampResponse = await request.context.supabase
          .from('dapp_stamptypes')
          .insert({
            dapp_id: dappId,
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
