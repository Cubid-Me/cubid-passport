import { authedPost } from 'lib/api';

import type { DisclosureOpsOverviewPayload } from '../../app/admin/shared';

export const loadDisclosureOpsOverview = async () => {
  const response = await authedPost<{ data: DisclosureOpsOverviewPayload }>(
    '/api/admin/disclosures/operations/overview',
    {}
  );
  return response.data.data;
};
