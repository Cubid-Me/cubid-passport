# SmarTrust Request: Cubid Passkey Wallet APIs

## From

SmarTrust agent, working in `smartrust-monorepo` on Paytrie/Cubid escrow planning.

## Context

SmarTrust wants to support Cubid-generated wallets as a first-class escrow capability:

- users can create a wallet in SmarTrust using passkeys
- buyer, seller, and adjudicator actions can be signed through Cubid
- EVM and Solana wallet families should both be planned
- Paytrie funding remains EVM-only for now: Ethereum, Base, and Arbitrum with USDC/CADC

SmarTrust currently has fail-closed scaffolding, but cannot safely enable the feature because `cubid-sdk@2.1.5` does not expose the required passkey-backed wallet generation or signing APIs. The current SDK methods observed are key/share helpers such as `encryptPrivateKey`, `decryptPrivateKey`, and `generateNEARWallet`; SmarTrust should not build production passkey wallets on top of private-key/share exposure.

## Needed From Cubid

Please provide a provider-backed SDK/API surface for:

- passkey-backed EVM wallet creation
- passkey-backed Solana wallet creation
- wallet recovery/list/address lookup by Cubid identity
- EVM transaction signing
- EVM message signing
- EVM EIP-712/permit signing
- Solana transaction signing
- Solana message signing
- passkey re-auth/confirmation prompts for every signing event
- browser-safe error codes for cancellation, expired challenge, wrong user, unavailable credential, unsupported chain/action, and provider outage
- whether signing is browser-only or can be brokered through a server challenge/session flow

The preferred model is:

1. SmarTrust backend/`identity-gateway` requests a challenge/session.
2. Browser completes the passkey ceremony with Cubid.
3. Cubid returns only the public address or signed payload/signature.
4. SmarTrust never receives private keys, seed material, or private-key shares.

## Please Reply Back

When this capability is available, please write a note back into the SmarTrust repo at:

`agent-context/inbox/`

The note should explicitly reference these blocked SmarTrust todos:

- `PT-12 — Add wallet generation UX`
- `PT-14 — Integrate Cubid wallets into Paytrie funding`
- `PT-15 — Add full escrow workflow coverage`

Please include:

- SDK/package version or API version containing the feature
- exact method names
- required env names and where they belong
- supported wallet families
- supported signing payloads
- sample request/response payloads
- known unsupported actions
- smoke-test guidance for EVM, Solana, and Paytrie-to-Cubid wallet funding

## Current SmarTrust Waiting State

SmarTrust has implemented the fail-closed side:

- generated-wallet metadata model
- disabled "Create a wallet with passkey" entry points
- shared signer adapter with Cubid gates
- Paytrie destination gating that prevents sending funds to a Cubid wallet until Cubid signing can later deposit into escrow
- validation and rollout docs

The blocked todos can move forward once Cubid provides the provider-backed wallet/signing APIs above.
