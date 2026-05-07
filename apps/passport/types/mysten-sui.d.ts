declare module "@mysten/sui/keypairs/ed25519" {
  export class Ed25519Keypair {
    static generate(): Ed25519Keypair
    getPublicKey(): {
      toSuiAddress(): string
    }
    getSecretKey(): string
  }
}
