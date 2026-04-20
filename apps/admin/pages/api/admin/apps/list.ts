import type { NextApiRequest, NextApiResponse } from 'next';

import {
  requireAdminUser,
  sendMethodNotAllowed,
  sendServerError,
} from '../../../../lib/server/adminApi';

const listApps = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST']);
  }

  const context = await requireAdminUser(req, res);

  if (!context) {
    return;
  }

  try {
    const { data, error } = await context.supabase
      .from('dapps')
      .select('*')
      .match({ admin_uid: context.adminUser.uid });

    if (error) {
      throw error;
    }

    return res.status(200).json({ data: data ?? [] });
  } catch (error) {
    return sendServerError(res, error, 'Failed to load apps');
  }
};

export default listApps;
