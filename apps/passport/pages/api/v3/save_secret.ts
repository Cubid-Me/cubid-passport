import type { NextApiRequest, NextApiResponse } from "next"
import { randomUUID } from "node:crypto"

import { ApiSecurityError } from "@cubid/auth/server"
import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import {
  getApiV3IdempotencyKey,
  runApiV3IdempotentWrite,
} from "@/lib/server/apiV3Idempotency"
import {
  DAPP_USER_SECRET_LEGACY_SENTINEL,
  DAPP_USER_SECRET_PURPOSE,
  encryptDappUserSecret,
} from "@/lib/server/dappUserSecrets"
import { getPassportSupabase } from "@/lib/server/supabase"

const isUniqueConstraintError = (error: unknown) => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  )
}

const insertEncryptedSecretWithSequence = async (
  supabase: ReturnType<typeof getPassportSupabase>,
  row: Record<string, unknown>,
  dappUserUuid: string
) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: existingRows, error: existingError } = await supabase
      .schema("private")
      .from("dapp_user_secrets")
      .select("secret_sequential_id")
      .eq("dapp_user_uuid", dappUserUuid)

    if (existingError) {
      throw existingError
    }

    const nextSequence =
      (existingRows ?? []).reduce((max, existingRow) => {
        const value = Number(existingRow.secret_sequential_id ?? 0)
        return Number.isFinite(value) && value > max ? value : max
      }, 0) + 1

    const { error } = await supabase
      .schema("private")
      .from("dapp_user_secrets")
      .insert({
        ...row,
        secret_sequential_id: nextSequence,
      })

    if (!error) {
      return
    }

    if (!isUniqueConstraintError(error) || attempt === 2) {
      throw error
    }
  }
}

const schema = passportSchemas.z.object({
  api_key: passportSchemas.z.string().min(1).optional(),
  apikey: passportSchemas.z.string().min(1).optional(),
  dapp_id: passportSchemas.z.union([
    passportSchemas.z.number().int().positive(),
    passportSchemas.z.string().min(1),
  ]).optional(),
  secret: passportSchemas.z.string().min(1),
  user_id: passportSchemas.z.string().uuid(),
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return handlePassportRoute(
    req,
    res,
    {
      actor: "dapp",
      bodySchema: schema,
      rateLimitGroup: "passport_dapp_mutation",
      route: "v3.save_secret",
    },
    async ({ body, context }) => {
      const supabase = getPassportSupabase()
      const response = await runApiV3IdempotentWrite({
        actorIdentifier: context.actorIdentifier,
        actorType: context.actorType,
        body,
        idempotencyKey: getApiV3IdempotencyKey(req),
        requestId: context.requestId,
        route: "v3.save_secret",
        supabase,
        handler: async () => {
          const { data: dappUser, error: dappUserError } = await supabase
            .from("dapp_users")
            .select("uuid,dapp_id")
            .eq("uuid", body.user_id)
            .eq("dapp_id", context.dapp.id)
            .maybeSingle()

          if (dappUserError) {
            throw dappUserError
          }

          if (!dappUser) {
            throw new ApiSecurityError(
              404,
              "not_found",
              "Dapp user was not found for the authenticated app."
            )
          }

          const encryptedSecret = await encryptDappUserSecret(
            supabase,
            body.secret,
            {
              dappId: context.dapp.id,
              dappUserUuid: body.user_id,
              purpose: DAPP_USER_SECRET_PURPOSE,
            }
          )

          await insertEncryptedSecretWithSequence(
            supabase,
            {
              ...encryptedSecret,
              dapp_user_uuid: body.user_id,
              secret: DAPP_USER_SECRET_LEGACY_SENTINEL,
            },
            body.user_id
          )

          const { error: auditError } = await supabase
            .from("api_security_events")
            .insert({
              actor_identifier: context.actorIdentifier,
              actor_type: context.actorType,
              details: {
                dappId: String(context.dapp.id),
                dappUserUuid: body.user_id,
                purpose: DAPP_USER_SECRET_PURPOSE,
              },
              event_id: `api_event_${randomUUID().replace(/-/g, "")}`,
              event_type: "dapp_user_secret.encrypted",
              outcome: "success",
              request_id: context.requestId,
              route: "v3.save_secret",
            })

          if (auditError) {
            throw auditError
          }

          return { body: { success: true }, statusCode: 200 }
        },
      })

      return res.status(response.statusCode).json(response.body)
    }
  )
}
