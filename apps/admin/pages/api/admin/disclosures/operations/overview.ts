import type { NextApiRequest, NextApiResponse } from 'next';

import {
  prepareAdminApiRequest,
  sendServerError,
} from '../../../../../lib/server/adminApi';
import { adminNoBodySchema } from '../../../../../lib/server/adminSchemas';
import { loadDisclosureOpsOverview } from '../../../../../lib/server/disclosureOperations';

const overview = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminNoBodySchema,
    rateLimitGroup: 'admin_read',
    route: 'admin/disclosures/operations/overview',
  });

  if (!request) {
    return;
  }

  try {
    const data = await loadDisclosureOpsOverview(request.context.supabase);
    return res.status(200).json({ data });
  } catch (error) {
    return sendServerError(
      res,
      error,
      'Failed to load disclosure operations overview'
    );
  }
};

export default overview;
