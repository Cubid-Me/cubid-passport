import axios from 'axios';
import { authedPost } from 'lib/api';

import type { OidcOpsOverviewPayload } from '../../app/admin/shared';

export type RateLimitTier = 'starter' | 'trusted' | 'internal';

export const RATE_LIMIT_TIERS: RateLimitTier[] = [
  'starter',
  'trusted',
  'internal',
];

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data;
    if (typeof payload === 'object' && payload !== null) {
      const apiError = (payload as { error?: unknown; message?: unknown })
        .error;
      const apiMessage = (payload as { error?: unknown; message?: unknown })
        .message;

      if (typeof apiError === 'string' && apiError.trim()) {
        return apiError;
      }

      if (typeof apiMessage === 'string' && apiMessage.trim()) {
        return apiMessage;
      }
    }
  }

  return error instanceof Error ? error.message : fallback;
};

export const loadOidcOpsOverview = async () => {
  const response = await authedPost<{ data: OidcOpsOverviewPayload }>(
    '/api/admin/oidc/operations/overview',
    {}
  );
  return response.data.data;
};

export const updateOidcOpsClient = async (
  clientId: string,
  patch: { rateLimitTier?: RateLimitTier; status?: 'active' | 'suspended' }
) => {
  await authedPost('/api/admin/oidc/clients/update-ops', {
    clientId,
    ...patch,
  });
};
