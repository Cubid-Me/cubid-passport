import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { getPassportSupabase } from "@/lib/server/supabase"

import { stampsWithId } from "./../utils/stampKey"

const cyrb53 = (str: string, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0, ch; i < str.length; i += 1) {
    ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)

  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

const schema = passportSchemas.z.object({
  dapp_id: passportSchemas.z.string().min(1),
  email: passportSchemas.z.string().email().optional(),
  evm: passportSchemas.z.string().min(1).optional(),
  phone: passportSchemas.z.string().min(1).optional(),
  stamptype: passportSchemas.z.unknown().optional(),
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return handlePassportRoute(
    req,
    res,
    {
      actor: "anonymous",
      bodySchema: schema,
      rateLimitGroup: "passport_dapp_mutation",
      route: "dapp.create_user",
    },
    async ({ body }) => {
      const supabase = getPassportSupabase()
      const { data: dappRow, error: dappError } = await supabase
        .from("dapps")
        .select("*")
        .eq("apikey", body.dapp_id)
        .maybeSingle()

      if (dappError) {
        throw dappError
      }

      if (!dappRow?.id) {
        return res.status(400).json({ error: "Invalid API key or dapp_id" })
      }

      const uniqueValue = body.phone || body.email || body.evm
      if (!uniqueValue) {
        return res.status(400).json({ error: "No valid identifier provided" })
      }

      const { data: stampData, error: stampLookupError } = await supabase
        .from("stamps")
        .select("*")
        .eq("uniquevalue", uniqueValue)

      if (stampLookupError) {
        throw stampLookupError
      }

      if (stampData?.length) {
        const user_id = stampData[0].created_by_user_id
        const { data: dappUsers, error } = await supabase
          .from("dapp_users")
          .select("*,users:user_id(*)")
          .match({ dapp_id: dappRow.id, user_id })

        if (error) {
          throw error
        }

        if (!dappUsers?.length) {
          const { data: newDappUser, error: createError } = await supabase
            .from("dapp_users")
            .insert({ dapp_id: dappRow.id, user_id })
            .select("*")

          if (createError) {
            throw createError
          }

          return res.status(200).json({
            error: null,
            newuser: true,
            uuid: newDappUser?.[0]?.uuid,
          })
        }

        return res.status(200).json({
          newuser: false,
          user: dappUsers[0],
          uuid: dappUsers[0]?.uuid,
        })
      }

      let user_id: number | null = null
      for (const identifier of ["email", "phone", "evm"] as const) {
        const value = body[identifier]
        if (!value || user_id) {
          continue
        }

        const { data: existingUsers, error } = await supabase
          .from("users")
          .select("*")
          .eq(identifier, value)

        if (error) {
          throw error
        }

        if (existingUsers?.[0]?.id) {
          user_id = existingUsers[0].id
        }
      }

      if (!user_id) {
        const insertPayload =
          body.email
            ? { email: body.email }
            : body.phone
              ? { phone: body.phone }
              : { evm: body.evm }
        const { data: newUser, error } = await supabase
          .from("users")
          .insert({
            ...insertPayload,
            created_by_app: dappRow.id,
            is_3rd_party: true,
          })
          .select("*")

        if (error) {
          throw error
        }

        user_id = newUser?.[0]?.id ?? null
      }

      const stampIdToAssign =
        (stampsWithId as Record<string, number>)[
          body.phone ? "phone" : body.evm ? "evm" : "email"
        ]
      const { data: newStamp, error: newStampError } = await supabase
        .from("stamps")
        .insert({
          created_by_app: dappRow.id,
          created_by_user_id: user_id,
          identity: body.email,
          is_third_party: true,
          is_verified: false,
          stamp_json: {
            [body.phone ? "phone" : body.evm ? "evm" : "email"]: uniqueValue,
          },
          stamptype: stampIdToAssign,
          type_and_uniquehash: `${stampIdToAssign} ${cyrb53(uniqueValue)}`,
          unique_hash: cyrb53(uniqueValue),
          uniquevalue: uniqueValue,
          user_id_and_uniqueval: `${user_id} ${stampIdToAssign} ${uniqueValue}`,
        })
        .select("*")

      if (newStampError) {
        throw newStampError
      }

      const { data: newDappUser, error: dappUserError } = await supabase
        .from("dapp_users")
        .insert({
          dapp_id: dappRow.id,
          user_id,
        })
        .select("*")

      if (dappUserError) {
        throw dappUserError
      }

      const { error } = await supabase.from("stamp_dappuser_permissions").insert({
        can_delete: true,
        can_read: true,
        can_write: true,
        dappuser_id: newDappUser?.[0]?.uuid,
        stamp_id: newStamp?.[0]?.id,
      })

      if (error) {
        throw error
      }

      return res.status(200).json({
        dappUserError: null,
        error: null,
        newStampError: null,
        newuser: true,
        uuid:
          newDappUser?.[0]?.uuid ??
          (
            await supabase
              .from("dapp_users")
              .select("*")
              .match({ dapp_id: dappRow.id, user_id })
          )?.data?.[0]?.uuid,
      })
    }
  )
}
