import { createEvmStampData, type CubidEvmConnection } from "@cubid/evm"

export type CubidWagmiAccount = {
  address: string
  chainId?: number
  connectorId?: string
}

export function createWagmiEvmStampData(account: CubidWagmiAccount) {
  const connection: CubidEvmConnection = {
    address: account.address,
    chainId: account.chainId,
    metadata:
      account.connectorId === undefined
        ? undefined
        : { connectorId: account.connectorId },
  }
  return {
    ...createEvmStampData(connection),
    connectorId: account.connectorId,
  }
}
