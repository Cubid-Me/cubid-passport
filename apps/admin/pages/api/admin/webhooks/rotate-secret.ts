import { randomBytes, randomUUID } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

import { adminWebhookRotateSecretSchema } from '../../../../lib/server/adminSchemas';
import {
  getOwnedDapp,
  prepareAdminApiRequest,
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

const rotateWebhookSecret = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  const request = await prepareAdminApiRequest(req, res, {
    actor: 'admin',
    bodySchema: adminWebhookRotateSecretSchema,
    rateLimitGroup: 'admin_sensitive',
    route: 'admin/webhooks/rotate-secret',
  });

  if (!request) {
    return;
  }

  try {
    const { webhookId } = request.body;
    const existingResponse = await request.context.supabase
      .from('dapp_webhook_subscriptions')
      .select('*')
      .eq('id', webhookId)
      .maybeSingle();

    if (existingResponse.error) {
      throw existingResponse.error;
    }

    const existingWebhook = existingResponse.data;
    if (!existingWebhook) {
      return sendForbidden(res, 'You do not have access to that webhook');
    }

    const ownedDapp = await getOwnedDapp(
      request.context,
      Number(existingWebhook.dapp)
    );

    if (!ownedDapp) {
      return sendForbidden(res, 'You do not have access to that webhook');
    }

    const webhookSecret = randomBytes(32).toString('hex');
    const secretReferenceId = randomUUID();
    const encryptedSecret = await encryptWebhookSigningSecret(
      request.context.supabase,
      webhookSecret,
      {
        dappId: existingWebhook.dapp,
        secretReferenceId,
        webhook: String(existingWebhook.webhook),
      }
    );

    const updatedResponse = await request.context.supabase
      .from('dapp_webhook_subscriptions')
      .update({
        ...encryptedSecret,
        secret: WEBHOOK_SIGNING_SECRET_LEGACY_SENTINEL,
        secret_encrypted_at: new Date().toISOString(),
        secret_reference_id: secretReferenceId,
        secret_rotated_at: new Date().toISOString(),
      })
      .eq('id', webhookId)
      .select('*')
      .maybeSingle();

    if (updatedResponse.error) {
      throw updatedResponse.error;
    }

    await writeWebhookSecretSecurityEvent(request.context.supabase, {
      actor_identifier: request.context.adminUser.uid,
      actor_type: 'admin',
      details: {
        dappId: existingWebhook.dapp,
        webhookId,
        webhook: existingWebhook.webhook,
      },
      event_id: `api_event_${randomUUID().replace(/-/g, '')}`,
      event_type: 'webhook_signing_secret.rotated',
      outcome: 'success',
      request_id: request.requestId,
      route: 'admin/webhooks/rotate-secret',
    });

    return res.status(200).json({
      data: {
        ...redactWebhookSecretFields(updatedResponse.data),
        webhookSecret,
      },
    });
  } catch (error) {
    return sendServerError(res, error, 'Failed to rotate webhook secret');
  }
};

export default rotateWebhookSecret;
