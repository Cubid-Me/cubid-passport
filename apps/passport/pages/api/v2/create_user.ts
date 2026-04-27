import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { getPassportSupabase } from "@/lib/server/supabase"

import { stampsWithId } from "./../utils/stampKey"

const mappedUserIdentifiers: Record<string, string> = {
  email: "email",
  evm: "evm",
  github_sub: "github",
  google_sub: "google",
  linkedin_sub: "linkedin",
  phone: "phone",
  twitter_sub: "twitter",
}

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
  apikey: passportSchemas.z.string().min(1),
  dapp_id: passportSchemas.z.union([
    passportSchemas.z.number().int().positive(),
    passportSchemas.z.string().min(1),
  ]),
  email: passportSchemas.z.string().email().optional(),
  evm: passportSchemas.z.string().min(1).optional(),
  github_sub: passportSchemas.z.string().min(1).optional(),
  google_sub: passportSchemas.z.string().min(1).optional(),
  linkedin_sub: passportSchemas.z.string().min(1).optional(),
  phone: passportSchemas.z.string().min(1).optional(),
  twitter_sub: passportSchemas.z.string().min(1).optional(),
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
      route: "v2.create_user",
    },
    async ({ body, context }) => {
      const userIdentifiers = {
        email: body.email,
        evm: body.evm,
        github_sub: body.github_sub,
        google_sub: body.google_sub,
        linkedin_sub: body.linkedin_sub,
        phone: body.phone,
        twitter_sub: body.twitter_sub,
      }

      let uniqueValue: string | null = null
      let stampType: number | null = null

      for (const [key, value] of Object.entries(mappedUserIdentifiers)) {
        const identifier = userIdentifiers[key as keyof typeof userIdentifiers]
        if (identifier) {
          uniqueValue = identifier
          stampType = (stampsWithId as Record<string, number>)[value] ?? null
          break
        }
      }

      if (!uniqueValue || !stampType) {
        return res.status(400).json({ error: "No valid identifier provided" })
      }

      const supabase = getPassportSupabase()
      const { data: stampData, error: stampLookupError } = await supabase
        .from("stamps")
        .select("*")
        .eq("uniquevalue", uniqueValue)

      if (stampLookupError) {
        throw stampLookupError
      }

      if (stampData?.length) {
        const userId = stampData[0].created_by_user_id
        const { data: dappUsers, error: dappUserError } = await supabase
          .from("dapp_users")
          .select("*,users:user_id(*)")
          .match({ dapp_id: context.dapp.id, user_id: userId })

        if (dappUserError) {
          throw dappUserError
        }

        if (!dappUsers?.length) {
          const { data: newDappUser, error } = await supabase
            .from("dapp_users")
            .insert({ dapp_id: context.dapp.id, user_id: userId })
            .select("*")

          if (error) {
            throw error
          }

          return res.status(200).json({
            error: null,
            is_blacklisted: false,
            is_new_app_user: false,
            is_sybil_attack: false,
            user_id: newDappUser?.[0]?.uuid,
          })
        }

        return res.status(200).json({
          error: null,
          is_blacklisted: false,
          is_new_app_user: false,
          is_sybil_attack: false,
          user_id: dappUsers[0]?.uuid,
        })
      }

      let userId: number | null = null

      for (const identifier of ["email", "phone", "evm"] as const) {
        const value = body[identifier]
        if (!value || userId) {
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
          userId = existingUsers[0].id
        }
      }

      if (!userId) {
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
            created_by_app: context.dapp.id,
            is_3rd_party: true,
          })
          .select("*")

        if (error) {
          throw error
        }

        userId = newUser?.[0]?.id ?? null
      }

      const { data: newStamp, error: newStampError } = await supabase
        .from("stamps")
        .insert({
          created_by_app: context.dapp.id,
          created_by_user_id: userId,
          stamp_json: { [stampType]: uniqueValue },
          stamptype: stampType,
          type_and_uniquehash: `${stampType} ${cyrb53(uniqueValue)}`,
          unique_hash: cyrb53(uniqueValue),
          uniquevalue: uniqueValue,
          user_id_and_uniqueval: `${userId} ${stampType} ${uniqueValue}`,
        })
        .select("*")

      if (newStampError) {
        throw newStampError
      }

      const { data: newDappUser, error: dappUserError } = await supabase
        .from("dapp_users")
        .insert({
          auth_stamp: newStamp?.[0]?.id,
          dapp_id: context.dapp.id,
          user_id: userId,
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
        error: null,
        is_blacklisted: false,
        is_new_app_user: true,
        is_sybil_attack: false,
        user_id: newDappUser?.[0]?.uuid,
      })
    }
  )
}
