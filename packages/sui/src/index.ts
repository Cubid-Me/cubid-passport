export type CubidSuiConnection = {
  address: string
  network?: string
}

export function createSuiStampData(connection: CubidSuiConnection) {
  const address = connection.address.trim()
  return {
    address,
    chainType: "sui" as const,
    identity: address,
    network: connection.network,
    uniquevalue: address,
    walletType: "sui" as const,
  }
}
