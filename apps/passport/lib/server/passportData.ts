import { getRequiredEnv } from "@cubid/config"
import { ApiSecurityError } from "@cubid/auth/server"
import { STAMP_TYPE_IDS, getStampTypeId } from "@cubid/stamps"

import { encode_data } from "@/lib/encode_data"

import { getPassportSupabase } from "./supabase"

const toRecord = (value: unknown) => {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>
  }

  return {}
}

const getConfiguredPassportDappId = () => {
  const value = process.env.NEXT_PUBLIC_DAPP_ID?.trim()

  if (!value) {
    throw new Error("Missing NEXT_PUBLIC_DAPP_ID")
  }

  return Number(value)
}

const invokeInternalWebhookTrigger = async (input: {
  stamparray: number[]
  webhook:
    | "credential_added"
    | "credential_blacklisted"
    | "credential_removed"
    | "credential_whitelisted"
    | "score_decrease"
    | "score_increase"
}) => {
  if (!input.stamparray.length) {
    return
  }

  const response = await fetch(
    `${getRequiredEnv("PASSPORT_PUBLIC_ORIGIN")}/api/cubid-webhook/trigger-url`,
    {
      body: JSON.stringify(input),
      headers: {
        "Authorization": `Bearer ${getRequiredEnv("PASSPORT_INTERNAL_API_TOKEN")}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    }
  )

  if (!response.ok) {
    throw new Error(`Internal webhook trigger failed with ${response.status}`)
  }
}

const emitStampAddedWebhooks = async (typeAndUniquehash: string) => {
  const supabase = getPassportSupabase()
  const { data: allBlacklistedStamps, error: blacklistedError } = await supabase
    .from("all_blacklisted_stamps")
    .select("*")
    .eq("type_and_uniquehash", typeAndUniquehash)

  if (blacklistedError) {
    throw blacklistedError
  }

  const { data: allWhitelistedStamps, error: whitelistedError } = await supabase
    .from("all_blacklisted_stamps")
    .select("*")
    .eq("type_and_uniquehash", typeAndUniquehash)

  if (whitelistedError) {
    throw whitelistedError
  }

  const blacklistedIds = allBlacklistedStamps?.[0]?.stamp_ids ?? []
  const whitelistedIds = allWhitelistedStamps?.[0]?.stanp_ids ?? []
  const combinedIds = [...whitelistedIds, ...blacklistedIds].filter(
    (value: unknown): value is number => typeof value === "number"
  )

  if (blacklistedIds.length) {
    await invokeInternalWebhookTrigger({
      stamparray: blacklistedIds,
      webhook: "credential_blacklisted",
    })
  }

  if (whitelistedIds.length) {
    await invokeInternalWebhookTrigger({
      stamparray: whitelistedIds,
      webhook: "credential_whitelisted",
    })
  }

  if (combinedIds.length) {
    await invokeInternalWebhookTrigger({
      stamparray: combinedIds,
      webhook: "score_increase",
    })
    await invokeInternalWebhookTrigger({
      stamparray: combinedIds,
      webhook: "credential_added",
    })
  }
}

export const passportDataQueries = {
  async findBrightIdDataByEmail(email: string) {
    const { data, error } = await getPassportSupabase()
      .from("brightid-data")
      .select("*")
      .eq("email", email)
      .maybeSingle()

    if (error) {
      throw error
    }

    return data
  },

  async findDappPageById(pageId: number) {
    const { data, error } = await getPassportSupabase()
      .from("dapp_pages")
      .select("*")
      .eq("id", pageId)
      .maybeSingle()

    if (error) {
      throw error
    }

    return data
  },

  async findUserByIdentity(input: { email?: string; phone?: string }) {
    if (!input.email && !input.phone) {
      throw new ApiSecurityError(
        400,
        "invalid_request",
        "Email or phone is required."
      )
    }

    const query = getPassportSupabase().from("users").select("*")
    const { data, error } = input.email
      ? await query.eq("email", input.email).maybeSingle()
      : await query.eq("phone", input.phone).maybeSingle()

    if (error) {
      throw error
    }

    return data
  },

  async findWalletDetailsByIdentity(input: { email?: string; phone?: string }) {
    if (!input.email && !input.phone) {
      throw new ApiSecurityError(
        400,
        "invalid_request",
        "Email or phone is required."
      )
    }

    const query = getPassportSupabase().from("wallet_details").select("*")
    const { data, error } = input.email
      ? await query.eq("email", input.email).maybeSingle()
      : await query.eq("phone", input.phone).maybeSingle()

    if (error) {
      throw error
    }

    return data
  },

  async listStampPermissionsByDappUser(dappUserId: string) {
    const { data, error } = await getPassportSupabase()
      .from("stamp_dappuser_permissions")
      .select("*")
      .eq("dappuser_id", dappUserId)

    if (error) {
      throw error
    }

    return data ?? []
  },

  async listStampsByUser(input: { stampTypeIds?: number[]; userId: number }) {
    let query = getPassportSupabase()
      .from("stamps")
      .select("*")
      .eq("created_by_user_id", input.userId)

    if (input.stampTypeIds?.length) {
      query = query.in("stamptype", input.stampTypeIds)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return data ?? []
  },

  async listStampTypes() {
    const { data, error } = await getPassportSupabase()
      .from("stamptypes")
      .select("*")

    if (error) {
      throw error
    }

    return data ?? []
  },

  async lookupGoodDollarState(input: { email: string; identifier?: string }) {
    const [walletDetailsResponse, whitelistResponse] = await Promise.all([
      getPassportSupabase()
        .from("wallet_details")
        .select("*")
        .eq("email", input.email)
        .maybeSingle(),
      input.identifier
        ? getPassportSupabase()
            .from("whitelist")
            .select("*")
            .eq("identifier", input.identifier)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])

    if (walletDetailsResponse.error) {
      throw walletDetailsResponse.error
    }

    if (whitelistResponse.error) {
      throw whitelistResponse.error
    }

    return {
      walletDetails: walletDetailsResponse.data,
      whitelistEntry: whitelistResponse.data,
    }
  },
}

export const passportDataCommands = {
  async createEvmAccount(input: {
    createdByUserId: number
    privateKey: string
    publicKey: string
  }) {
    const { data, error } = await getPassportSupabase()
      .from("evm_accounts")
      .insert({
        address: input.publicKey,
        created_by_user_id: input.createdByUserId,
        private_key: input.privateKey,
        public_key: input.publicKey,
        user_id: input.createdByUserId,
      })
      .select("*")
      .maybeSingle()

    if (error) {
      throw error
    }

    return data
  },

  async createStamp(input: {
    appId: number
    isAuth?: boolean
    stampData: Record<string, unknown>
    stampType: string
    userId: number
    userUuid?: string
  }) {
    const supabase = getPassportSupabase()
    const stampTypeId = getStampTypeId(input.stampType)

    if (!stampTypeId) {
      throw new ApiSecurityError(
        400,
        "invalid_request",
        "Unsupported stamp type."
      )
    }

    const { data: stampTypeRow, error: stampTypeError } = await supabase
      .from("stamptypes")
      .select("*")
      .eq("id", stampTypeId)
      .maybeSingle()

    if (stampTypeError) {
      throw stampTypeError
    }

    const fieldsToUse = toRecord(stampTypeRow?.fields_to_use)
    const encodedPayload = await encode_data(JSON.stringify(input.stampData))
    const childInserts: Array<Record<string, unknown>> = []

    if (fieldsToUse.make_child_email_stamp && typeof input.stampData.email === "string") {
      childInserts.push({
        created_by_app: input.appId,
        created_by_user_id: input.userId,
        identity: input.stampData.email,
        is_auth: Boolean(input.isAuth),
        stamp_json: { stampData: input.stampData },
        stamptype: STAMP_TYPE_IDS.email,
        type_and_uniquehash: `${STAMP_TYPE_IDS.email} ${encodedPayload}`,
        unique_hash: encodedPayload,
        uniquevalue: input.stampData.email,
        user_id_and_uniqueval: `${input.userId} ${STAMP_TYPE_IDS.email} ${input.stampData.email}`,
      })
    }

    if (fieldsToUse.make_child_phone_stamp && typeof input.stampData.phone === "string") {
      childInserts.push({
        created_by_app: input.appId,
        created_by_user_id: input.userId,
        identity: input.stampData.phone,
        is_auth: Boolean(input.isAuth),
        stamp_json: { stampData: input.stampData },
        stamptype: STAMP_TYPE_IDS.phone,
        type_and_uniquehash: `${STAMP_TYPE_IDS.phone} ${encodedPayload}`,
        unique_hash: encodedPayload,
        uniquevalue: input.stampData.phone,
        user_id_and_uniqueval: `${input.userId} ${STAMP_TYPE_IDS.phone} ${input.stampData.phone}`,
      })
    }

    if (childInserts.length) {
      const { error: childError } = await supabase.from("stamps").insert(childInserts)

      if (childError) {
        throw childError
      }
    }

    const mainInsert = {
      created_by_app: input.appId,
      created_by_user_id: input.userId,
      identity:
        typeof input.stampData.identity === "string"
          ? input.stampData.identity
          : null,
      is_auth: Boolean(input.isAuth),
      stamp_json: { stampData: input.stampData },
      stamptype: stampTypeId,
      type_and_uniquehash: `${stampTypeId} ${encodedPayload}`,
      unique_hash: encodedPayload,
      uniquevalue:
        typeof input.stampData.uniquevalue === "string"
          ? input.stampData.uniquevalue
          : "",
      user_id_and_uniqueval: `${input.userId} ${stampTypeId} ${String(
        input.stampData.uniquevalue ?? ""
      )}`,
    }

    const { data: insertedStamp, error: insertError } = await supabase
      .from("stamps")
      .insert(mainInsert)
      .select("*")
      .maybeSingle()

    if (insertError) {
      throw insertError
    }

    let dappUserId = input.userUuid ?? null

    if (!dappUserId) {
      const { data: dappUser, error: dappUserError } = await supabase
        .from("dapp_users")
        .select("*")
        .eq("user_id", input.userId)
        .eq("dapp_id", input.appId)
        .maybeSingle()

      if (dappUserError) {
        throw dappUserError
      }

      if (dappUser?.uuid) {
        dappUserId = dappUser.uuid
      } else {
        const { data: newDappUser, error: newDappUserError } = await supabase
          .from("dapp_users")
          .insert({
            dapp_id: input.appId,
            user_id: input.userId,
          })
          .select("*")
          .maybeSingle()

        if (newDappUserError) {
          throw newDappUserError
        }

        dappUserId = newDappUser?.uuid ?? null
      }
    }

    if (insertedStamp?.id && dappUserId) {
      const { error: permissionError } = await supabase
        .from("stamp_dappuser_permissions")
        .insert({
          can_delete: true,
          can_read: true,
          can_write: true,
          dappuser_id: dappUserId,
          stamp_id: insertedStamp.id,
        })

      if (permissionError) {
        throw permissionError
      }
    }

    await emitStampAddedWebhooks(`${stampTypeId} ${encodedPayload}`)

    return insertedStamp
  },

  async deleteStamp(input: { dappId?: number; stampType: number; userId: number }) {
    const supabase = getPassportSupabase()
    const { data: stamp, error: stampError } = await supabase
      .from("stamps")
      .select("*")
      .eq("created_by_user_id", input.userId)
      .eq("stamptype", input.stampType)
      .maybeSingle()

    if (stampError) {
      throw stampError
    }

    if (!stamp?.id) {
      throw new ApiSecurityError(404, "not_found", "Stamp not found.")
    }

    const dappId = input.dappId ?? getConfiguredPassportDappId()

    const [authorizedDelete, stampDelete, uniqueDelete] = await Promise.all([
      supabase
        .from("authorized_dapps")
        .delete()
        .match({ dapp_id: dappId, stamp_id: stamp.id }),
      supabase
        .from("stamps")
        .delete()
        .match({ created_by_user_id: input.userId, stamptype: input.stampType }),
      supabase
        .from("uniquestamps")
        .delete()
        .match({ uniquehash: stamp.unique_hash }),
    ])

    if (authorizedDelete.error) {
      throw authorizedDelete.error
    }
    if (stampDelete.error) {
      throw stampDelete.error
    }
    if (uniqueDelete.error) {
      throw uniqueDelete.error
    }

    await invokeInternalWebhookTrigger({
      stamparray: [stamp.id],
      webhook: "score_decrease",
    })
    await invokeInternalWebhookTrigger({
      stamparray: [stamp.id],
      webhook: "credential_removed",
    })

    return { stampId: stamp.id }
  },

  async ensureUserByIdentity(input: {
    createdByApp?: number
    email?: string
    isThirdParty?: boolean
    phone?: string
  }) {
    if (!input.email && !input.phone) {
      throw new ApiSecurityError(
        400,
        "invalid_request",
        "Email or phone is required."
      )
    }

    const existing = await passportDataQueries.findUserByIdentity(input)

    if (existing) {
      return existing
    }

    const { data, error } = await getPassportSupabase()
      .from("users")
      .insert({
        created_by_app: input.createdByApp ?? null,
        email: input.email ?? null,
        is_3rd_party: Boolean(input.isThirdParty),
        phone: input.phone ?? null,
      })
      .select("*")
      .maybeSingle()

    if (error) {
      throw error
    }

    return data
  },

  async grantStampPermission(input: { dappUserId: string; stampId: number }) {
    const { data, error } = await getPassportSupabase()
      .from("stamp_dappuser_permissions")
      .insert({
        can_delete: true,
        can_read: true,
        can_write: true,
        dappuser_id: input.dappUserId,
        stamp_id: input.stampId,
      })
      .select("*")
      .maybeSingle()

    if (error) {
      throw error
    }

    return data
  },

  async syncGoodDollarWallet(input: {
    email: string
    identifier: string
    walletData: Record<string, unknown>
  }) {
    const supabase = getPassportSupabase()
    const [existingWalletResponse, existingWhitelistResponse] = await Promise.all([
      supabase
        .from("wallet_details")
        .select("*")
        .eq("email", input.email)
        .maybeSingle(),
      supabase
        .from("whitelist")
        .select("*")
        .eq("identifier", input.identifier)
        .maybeSingle(),
    ])

    if (existingWalletResponse.error) {
      throw existingWalletResponse.error
    }

    if (existingWhitelistResponse.error) {
      throw existingWhitelistResponse.error
    }

    if (existingWalletResponse.data?.id) {
      const { error } = await supabase
        .from("wallet_details")
        .update({
          email: input.email,
          "wallet-address": input.identifier,
          wallet_data: input.walletData,
        })
        .eq("id", existingWalletResponse.data.id)

      if (error) {
        throw error
      }
    } else {
      const { error } = await supabase.from("wallet_details").insert({
        email: input.email,
        "wallet-address": input.identifier,
        wallet_data: input.walletData,
      })

      if (error) {
        throw error
      }
    }

    if (!existingWhitelistResponse.data) {
      const { error } = await supabase.from("whitelist").insert({
        email: input.email,
        identifier: input.identifier,
      })

      if (error) {
        throw error
      }
    } else if (existingWhitelistResponse.data.email !== input.email) {
      const { error } = await supabase.from("blacklist").insert({
        email: input.email,
        identifier: input.identifier,
      })

      if (error) {
        throw error
      }
    }

    return {
      identifier: input.identifier,
      walletDetails: true,
    }
  },

  async updateUserProfile(input: {
    patch: Record<string, unknown>
    userId: number
  }) {
    const allowedPatchKeys = new Set([
      "address",
      "cubid_country",
      "cubid_postalcode",
      "phone",
      "poh_IsRegistered",
    ])

    const patch = Object.fromEntries(
      Object.entries(input.patch).filter(([key]) => allowedPatchKeys.has(key))
    )

    if (!Object.keys(patch).length) {
      throw new ApiSecurityError(
        400,
        "invalid_request",
        "No supported profile fields were provided."
      )
    }

    const { data, error } = await getPassportSupabase()
      .from("users")
      .update(patch)
      .eq("id", input.userId)
      .select("*")
      .maybeSingle()

    if (error) {
      throw error
    }

    return data
  },
}
