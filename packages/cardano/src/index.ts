export type CubidCardanoConnection = {
  address: string
  networkId?: number | string
  stakeAddress?: string
}

export function createCardanoStampData(connection: CubidCardanoConnection) {
  const address = connection.address.trim()
  return {
    address,
    chainType: "cardano" as const,
    identity: address,
    networkId: connection.networkId,
    stakeAddress: connection.stakeAddress,
    uniquevalue: address,
    walletType: "cardano" as const,
  }
}
