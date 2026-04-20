import type { NextApiRequest, NextApiResponse } from 'next';

import {
  ensureAdminUserRecord,
  requireVerifiedUser,
  sendMethodNotAllowed,
  sendServerError,
} from '../../../../lib/server/adminApi';

const syncAdminUser = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST']);
  }

  const context = await requireVerifiedUser(req, res);

  if (!context) {
    return;
  }

  try {
    const adminUser = await ensureAdminUserRecord(context);
    return res.status(200).json({ data: { adminUser } });
  } catch (error) {
    return sendServerError(res, error, 'Failed to sync admin user');
  }
};

export default syncAdminUser;
