import { generateDappApiKey } from '@cubid/auth/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export type DappApiKeySummary = {
  apiKeyLastUsedAt: string | null;
  apiKeyPrefix: string | null;
  apiKeyRotatedAt: string | null;
  apiKeyStatus: string | null;
};

export const createDappApiKey = async (
  supabase: SupabaseClient,
  dappId: number
) => {
  const material = generateDappApiKey();
  const { data, error } = await supabase
    .from('dapp_api_keys')
    .insert({
      dapp_id: dappId,
      hash_algorithm: 'scrypt',
      hash_version: 1,
      key_hash: material.keyHash,
      key_prefix: material.keyPrefix,
      rotated_at: new Date().toISOString(),
      status: 'active',
    })
    .select('*')
    .maybeSingle();

  if (error || !data) {
    throw error ?? new Error('Failed to create dapp API key');
  }

  return {
    apiKey: material.apiKey,
    keyRecord: data,
  };
};

export const rotateDappApiKey = async (
  supabase: SupabaseClient,
  dappId: number
) => {
  const now = new Date().toISOString();
  const replacement = await createDappApiKey(supabase, dappId);
  const revokeResponse = await supabase
    .from('dapp_api_keys')
    .update({
      revoked_at: now,
      status: 'revoked',
    })
    .eq('dapp_id', dappId)
    .eq('status', 'active')
    .neq('key_prefix', replacement.keyRecord.key_prefix);

  if (revokeResponse.error) {
    await supabase
      .from('dapp_api_keys')
      .update({
        revoked_at: now,
        status: 'revoked',
      })
      .eq('dapp_id', dappId)
      .eq('status', 'active')
      .eq('key_prefix', replacement.keyRecord.key_prefix);

    throw revokeResponse.error;
  }

  return replacement;
};

export const mapDappApiKeySummary = (
  row: Record<string, unknown> | null | undefined
): DappApiKeySummary => ({
  apiKeyLastUsedAt: typeof row?.last_used_at === 'string' ? row.last_used_at : null,
  apiKeyPrefix: typeof row?.key_prefix === 'string' ? row.key_prefix : null,
  apiKeyRotatedAt: typeof row?.rotated_at === 'string' ? row.rotated_at : null,
  apiKeyStatus: typeof row?.status === 'string' ? row.status : null,
});
