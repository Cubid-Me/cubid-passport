export type CubidSolanaConnection = {
  address: string
  metadata?: Record<string, unknown>
}

export function createSolanaStampData(connection: CubidSolanaConnection) {
  const address = connection.address.trim()
  return {
    address,
    chainType: "solana" as const,
    identity: address,
    ...(connection.metadata === undefined ? {} : { metadata: connection.metadata }),
    uniquevalue: address,
    walletType: "solana" as const,
  }
}
