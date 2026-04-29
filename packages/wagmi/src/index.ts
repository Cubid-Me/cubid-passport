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
    metadata: { connectorId: account.connectorId },
  }
  return {
    ...createEvmStampData(connection),
    connectorId: account.connectorId,
  }
}
