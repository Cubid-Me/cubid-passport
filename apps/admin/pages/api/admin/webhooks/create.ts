import { randomBytes, randomUUID } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

import { adminWebhookCreateSchema } from '../../../../lib/server/adminSchemas';
import {
  getOwnedDapp,
  getPlatformUserByEmail,
  prepareAdminApiRequest,
  sendBadRequest,
  sendForbidden,
  sendServerError,
} from '../../../../lib/server/adminApi';
import {
  encryptWebhookSigningSecret,
  WEBHOOK_SIGNING_SECRET_LEGACY_SENTINEL,
} from '../../../../lib/server/webhookSigningSecrets';

const redactWebhookSecretFields = (webhook: Record<string, unknown> | null) => {
  if (!webhook) {
    return webhook;
  }

  const {
    secret,
    secret_auth_tag,
    secret_ciphertext,
    secret_context,
    secret_iv,
    wrapped_data_key,
    wrapped_data_key_auth_tag,
    wrapped_data_key_iv,
    ...safeWebhook
  } = webhook;

  void secret;
  void secret_auth_tag;
  void secret_ciphertext;
  void secret_context;
  void secret_iv;
  void wrapped_data_key;
  void wrapped_data_key_auth_tag;
  void wrapped_data_key_iv;

  return safeWebhook;
};

const writeWebhookSecretSecurityEvent = async (
  supabase: { from: (table: string) => { insert: (row: Record<string, unknown>) => PromiseLike<{ error: unknown }> } },
  row: Record<string, unknown>
) => {
  try {
    const { error } = await supabase.from('api_security_events').insert(row);
    if (error) {
      throw error;
    }
  } catch (error) {
    // Secret custody must not fail open because audit logging is unavailable.
    throw error;
  }
};

const createWebhook = async (req: NextApiRequest, res: NextApiResponse) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminWebhookCreateSchema,
    rateLimitGroup: 'admin_sensitive',
    route: 'admin/webhooks/create',
  });

  if (!request) {
    return;
  }

  try {
    const { dappId, webhookTypeId, webhookUrl } = request.body;
    const ownedDapp = await getOwnedDapp(request.context, dappId);

    if (!ownedDapp) {
      return sendForbidden(res, 'You do not have access to that app');
    }

    const [platformUser, webhookTypeResponse] = await Promise.all([
      getPlatformUserByEmail(request.context),
      request.context.supabase
        .from('webhook_types')
        .select('*')
        .match({ id: webhookTypeId })
        .maybeSingle(),
    ]);

    if (!platformUser) {
      return sendForbidden(
        res,
        'No matching platform user record exists for this admin'
      );
    }

    if (webhookTypeResponse.error) {
      throw webhookTypeResponse.error;
    }

    if (!webhookTypeResponse.data) {
      return sendBadRequest(res, 'Invalid webhook type');
    }

    const webhookSecret = randomBytes(32).toString('hex');
    const secretReferenceId = randomUUID();
    const encryptedSecret = await encryptWebhookSigningSecret(
      request.context.supabase,
      webhookSecret,
      {
        dappId,
        secretReferenceId,
        webhook: webhookTypeResponse.data.name,
      }
    );

    const response = await request.context.supabase
      .from('dapp_webhook_subscriptions')
      .insert({
        dapp: dappId,
        webhook_url: webhookUrl,
        webhook: webhookTypeResponse.data.name,
        created_by_user: platformUser.id,
        status: 'active',
        secret: WEBHOOK_SIGNING_SECRET_LEGACY_SENTINEL,
        secret_encrypted_at: new Date().toISOString(),
        secret_reference_id: secretReferenceId,
        secret_rotated_at: new Date().toISOString(),
        ...encryptedSecret,
      })
      .select('*')
      .maybeSingle();

    if (response.error) {
      throw response.error;
    }

    await writeWebhookSecretSecurityEvent(request.context.supabase, {
      actor_identifier: request.context.adminUser.uid,
      actor_type: 'admin',
      details: {
        dappId,
        webhookId: response.data?.id ?? null,
        webhook: webhookTypeResponse.data.name,
      },
      event_id: `api_event_${randomUUID().replace(/-/g, '')}`,
      event_type: 'webhook_signing_secret.created',
      outcome: 'success',
      request_id: request.requestId,
      route: 'admin/webhooks/create',
    });

    return res.status(200).json({
      data: {
        ...redactWebhookSecretFields(response.data),
        webhookSecret,
      },
    });
  } catch (error) {
    return sendServerError(res, error, 'Failed to create webhook');
  }
};

export default createWebhook;
