import type { NextApiRequest, NextApiResponse } from 'next';

import { adminNoBodySchema } from '../../../../lib/server/adminSchemas';
import {
  prepareAdminApiRequest,
  sendServerError,
} from '../../../../lib/server/adminApi';
import { mapDappApiKeySummary } from '../../../../lib/server/dappApiKeys';

const listApps = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminNoBodySchema,
    rateLimitGroup: 'admin_read',
    route: 'admin/apps/list',
  });

  if (!request) {
    return;
  }

  try {
    const { data, error } = await request.context.supabase
      .from('dapps')
      .select('*')
      .match({ admin_uid: request.context.adminUser.uid });

    if (error) {
      throw error;
    }

    const dappIds = (data ?? []).map((dapp) => dapp.id);
    const activeKeysResponse =
      dappIds.length > 0
        ? await request.context.supabase
            .from('dapp_api_keys')
            .select('*')
            .in('dapp_id', dappIds)
            .eq('status', 'active')
        : { data: [], error: null };

    if (activeKeysResponse.error) {
      throw activeKeysResponse.error;
    }

    const keyByDappId = new Map<number, Record<string, unknown>>(
      (activeKeysResponse.data ?? []).map((keyRow): [number, Record<string, unknown>] => [
        Number(keyRow.dapp_id),
        keyRow as Record<string, unknown>,
      ])
    );

    const mapped = (data ?? []).map((dapp) => {
      const { apikey: _apikey, ...safeDapp } = dapp;
      return {
        ...safeDapp,
        ...mapDappApiKeySummary(keyByDappId.get(Number(dapp.id))),
      };
    });

    return res.status(200).json({ data: mapped });
  } catch (error) {
    return sendServerError(res, error, 'Failed to load apps');
  }
};

export default listApps;
