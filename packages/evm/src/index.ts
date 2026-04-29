export type CubidEvmConnection = {
  address: string
  chainId?: number | string
  metadata?: Record<string, unknown>
}

export type CubidEvmStampData = {
  address: string
  chainId?: number | string
  chainType: "evm"
  identity: string
  metadata?: Record<string, unknown>
  normalizedAddress: string
  uniquevalue: string
  walletType: "evm"
}

export function normalizeEvmAddress(address: string): string {
  return address.trim().toLowerCase()
}

export function createEvmStampData(
  connection: CubidEvmConnection
): CubidEvmStampData {
  const address = connection.address.trim()
  const normalizedAddress = normalizeEvmAddress(address)

  return {
    address,
    chainId: connection.chainId,
    chainType: "evm",
    identity: address,
    ...(connection.metadata === undefined ? {} : { metadata: connection.metadata }),
    normalizedAddress,
    uniquevalue: address,
    walletType: "evm",
  }
}
