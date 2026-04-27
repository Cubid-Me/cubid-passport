import axios from "axios"

export type PassportDataReadRequest =
  | {
      operation: "findBrightIdDataByEmail"
      email: string
    }
  | {
      operation: "findUserByIdentity"
      email?: string
      phone?: string
    }
  | {
      operation: "findWalletDetailsByIdentity"
      email?: string
      phone?: string
    }
  | {
      operation: "findDappPageById"
      pageId: number
    }
  | {
      operation: "listStampPermissionsByDappUser"
      dappUserId: string
    }
  | {
      operation: "listStampsByUser"
      stampTypeIds?: number[]
      userId: number
    }
  | {
      operation: "listStampTypes"
    }
  | {
      operation: "lookupGoodDollarState"
      email: string
      identifier?: string
    }

export type PassportDataCommandRequest =
  | {
      operation: "createEvmAccount"
      createdByUserId: number
      privateKey: string
      publicKey: string
    }
  | {
      operation: "createStamp"
      appId: number
      isAuth?: boolean
      stampData: Record<string, unknown>
      stampType: string
      userId: number
      userUuid?: string
    }
  | {
      operation: "deleteStamp"
      dappId?: number
      stampType: number
      userId: number
    }
  | {
      operation: "ensureUserByIdentity"
      createdByApp?: number
      email?: string
      isThirdParty?: boolean
      phone?: string
    }
  | {
      operation: "grantStampPermission"
      dappUserId: string
      stampId: number
    }
  | {
      operation: "syncGoodDollarWallet"
      email: string
      identifier: string
      walletData: Record<string, unknown>
    }
  | {
      operation: "updateUserProfile"
      patch: Record<string, unknown>
      userId: number
    }

export async function passportDataRead<TData = unknown>(
  payload: PassportDataReadRequest
) {
  const { data } = await axios.post<{ data: TData }>(
    "/api/passport/data/query",
    payload
  )
  return data.data
}

export async function passportDataCommand<TData = unknown>(
  payload: PassportDataCommandRequest
) {
  const { data } = await axios.post<{ data: TData }>(
    "/api/passport/data/command",
    payload
  )
  return data.data
}

export const findPassportUserByIdentity = (input: {
  email?: string
  phone?: string
}) => passportDataRead<any>({ operation: "findUserByIdentity", ...input })

export const findPassportBrightIdDataByEmail = (email: string) =>
  passportDataRead<any>({
    email,
    operation: "findBrightIdDataByEmail",
  })

export const ensurePassportUserByIdentity = (input: {
  createdByApp?: number
  email?: string
  isThirdParty?: boolean
  phone?: string
}) => passportDataCommand<any>({ operation: "ensureUserByIdentity", ...input })

export const findPassportWalletDetailsByIdentity = (input: {
  email?: string
  phone?: string
}) =>
  passportDataRead<any>({
    operation: "findWalletDetailsByIdentity",
    ...input,
  })

export const listPassportStampsByUser = (input: {
  stampTypeIds?: number[]
  userId: number
}) => passportDataRead<any[]>({ operation: "listStampsByUser", ...input })

export const listPassportStampTypes = () =>
  passportDataRead<any[]>({ operation: "listStampTypes" })

export const listPassportStampPermissions = (dappUserId: string) =>
  passportDataRead<any[]>({
    operation: "listStampPermissionsByDappUser",
    dappUserId,
  })

export const findPassportDappPageById = (pageId: number) =>
  passportDataRead<any>({
    operation: "findDappPageById",
    pageId,
  })

export const updatePassportUserProfile = (input: {
  patch: Record<string, unknown>
  userId: number
}) => passportDataCommand<any>({ operation: "updateUserProfile", ...input })

export const createPassportStamp = (input: {
  appId: number
  isAuth?: boolean
  stampData: Record<string, unknown>
  stampType: string
  userId: number
  userUuid?: string
}) => passportDataCommand<any>({ operation: "createStamp", ...input })

export const deletePassportStamp = (input: {
  dappId?: number
  stampType: number
  userId: number
}) => passportDataCommand<any>({ operation: "deleteStamp", ...input })

export const grantPassportStampPermission = (input: {
  dappUserId: string
  stampId: number
}) => passportDataCommand<any>({ operation: "grantStampPermission", ...input })

export const createPassportEvmAccount = (input: {
  createdByUserId: number
  privateKey: string
  publicKey: string
}) => passportDataCommand<any>({ operation: "createEvmAccount", ...input })

export const syncPassportGoodDollarWallet = (input: {
  email: string
  identifier: string
  walletData: Record<string, unknown>
}) =>
  passportDataCommand<any>({ operation: "syncGoodDollarWallet", ...input })

export const lookupPassportGoodDollarState = (input: {
  email: string
  identifier?: string
}) =>
  passportDataRead<{
    walletDetails: any
    whitelistEntry: any
  }>({ operation: "lookupGoodDollarState", ...input })
