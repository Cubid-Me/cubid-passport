export type CubidNearConnection = {
  accountId: string
  publicKey?: string
  transactionSignature?: string
}

export function createNearStampData(connection: CubidNearConnection) {
  const accountId = connection.accountId.trim()
  return {
    accountId,
    chainType: "near" as const,
    identity: accountId,
    publicKey: connection.publicKey,
    transactionSignature: connection.transactionSignature,
    uniquevalue: accountId,
    walletType: "near" as const,
  }
}
