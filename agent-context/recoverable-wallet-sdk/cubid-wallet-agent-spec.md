# Cubid Recoverable Wallet SDK — Agent Specification

## 0. Agent role

You are the **Cubid Recoverable Wallet SDK Agent**.

Your job is to design the architecture, package boundaries, developer experience, and product-facing specification for a Cubid-powered recoverable wallet SDK. You should focus on system design, interfaces, architecture, package structure, documentation, security boundaries, and integration patterns.

You should **not** rush into low-level cryptographic implementation. You should avoid hand-rolling cryptography. You should define what must exist, how components relate, what security invariants must hold, and where audited dependencies or specialist implementations are required.

The target output is an SDK that external apps can install and use to offer **passkey-first, app-mediated, recoverable embedded wallets** with Cubid recovery and no full server custody.

---

# 1. Background

SmarTrust is building a programmable trust layer for escrow, arbitration, milestone payments, and cross-chain workflows. The app context describes the product as making cross-chain escrow, arbitration, and milestone-based payments feel effortless, trustworthy, and universal, with a long-term goal of serving humans, agencies, DAOs, and AI agents through transparent programmable agreements. 

The current SmarTrust system is already centered on enforceable agreements, automated milestone payouts, neutral adjudication, cross-chain payment finality, and accounting sync between on-chain and off-chain state.  Its users include freelancers, agencies, startups, DAOs, AI agents, and platforms embedding escrow flows. 

The wallet SDK should serve that context. It is not a generic “crypto wallet demo.” It is infrastructure for letting apps such as SmarTrust offer a smoother alternative to normal EOA signing with MetaMask, Phantom, WalletConnect, or manually managed seed phrases.

SmarTrust’s architecture already separates meaningful roles such as buyer, seller, admin, adjudicator, factory, token manager, and deployer.  Escrow state is also explicit and forward-moving: initialization, funding, funded, started, disputed, adjudication, and closed.  The wallet SDK should respect that style: explicit roles, explicit states, clear authority boundaries, and no hidden custody assumptions.

---

# 2. Objective

Design and specify an npm package family that allows an external application to offer this wallet mode:

```text
Create app-recoverable wallet
→ Sign normally with passkey approval
→ App/server participates as policy co-signer
→ Cubid is invisible during normal signing
→ If device/passkey is lost, recover through Cubid
→ Server never has full private-key custody
```

This is a **user-selectable alternative** to external wallet connection.

The product should support two broad wallet choices:

```text
1. Connect existing wallet
   Examples: MetaMask, Phantom, WalletConnect-compatible wallets.
   User manages private keys, seed phrase, and recovery.

2. Create app-recoverable wallet
   Passkey-first signing.
   Cubid-backed recovery.
   App/server policy co-signing.
   No full private key custody by the app server.
```

The agent should treat this as an **assisted self-custody SDK**, not a custodial wallet product and not a fully decentralized sovereign wallet.

---

# 3. Core design decision

The architecture should use **Tier-1 only**:

```text
2-party threshold signing / MPC-style signing
```

Do **not** design the primary system around:

```text
encrypted private key + split DEK fallback
raw Shamir splitting of the wallet private key
server-supplied KEK for private-key reconstruction
client-side reconstruction of the full private key during normal signing
```

The preferred architecture is:

```text
Wallet key material is generated client-side.

A user signing share is protected by passkey-controlled access.

A server signing share is stored in hardened server-side signing infrastructure.

Normal signing requires:
  user signing share + server signing share

Recovery requires:
  Cubid-recovered user signing share + server signing share

The full private key is never reconstructed server-side.
The full private key should not be reconstructed client-side during normal signing.
```

This choice is central. Preserve it unless explicitly instructed otherwise.

---

# 4. Design principles

## 4.1 Product principles

The SDK should make embedded wallet creation feel simple to users:

```text
Create wallet → approve with passkey → transact
```

Normal signing should feel like:

```text
Open app
→ review transaction
→ approve with passkey / biometric
→ transaction signs
```

Cubid should not appear in normal signing flows.

Cubid should appear only for recovery, re-enrollment, high-risk step-up, or explicit backup-management actions.

## 4.2 Custody principles

The server may be mandatory, but it must not be independently powerful.

The following must remain true:

```text
Server alone cannot sign.
Device/passkey alone cannot sign.
Cubid alone cannot sign.
App backend credentials alone cannot fetch Cubid recovery material.
Cubid recovery material alone cannot move funds.
The full wallet private key is never reconstructed server-side.
```

The correct custody posture is:

```text
App-recoverable assisted self-custody.
```

Avoid saying:

```text
Fully decentralized.
Serverless self-custody.
Custodial wallet.
Cubid custody.
```

Use precise wording:

```text
The app server is a policy co-signer.
Cubid stores user-authorized recovery material.
The user signs normally with a passkey-protected wallet share.
No single component can move funds alone.
```

## 4.3 Architecture principles

The SDK should be modular, provider-driven, and app-embeddable.

It should allow:

```text
Cubid as the default recovery provider.
Other recovery providers in the future.
EVM adapters.
Solana adapters.
React hooks.
Server integration helpers.
Transaction-intent schemas.
Policy-bound signing sessions.
```

Do not tightly couple every layer to Cubid. The SDK may be published under `@cubid/*`, but its internals should still expose provider interfaces.

---

# 5. External standards and dependency background

WebAuthn is the correct base layer for passkey authentication. The W3C WebAuthn Level 3 specification defines strong, scoped, public-key credentials for web applications, created by authenticators and scoped to a relying party. ([W3C][1]) It also states that a WebAuthn credential private key is expected never to be exposed to another party, including the authenticator owner. ([W3C][1])

This means the agent must not treat a passkey as an exportable wallet private key. A passkey is an authentication and authorization primitive. It can approve ceremonies, unlock local material, and in some cases help derive encryption material through PRF, but it is not the wallet key itself.

SimpleWebAuthn is the recommended WebAuthn ceremony library. Its server package handles registration and authentication ceremony generation/verification patterns, including `generateRegistrationOptions`, `verifyRegistrationResponse`, and related server-side ceremony helpers. ([simplewebauthn.dev][2])

The WebAuthn PRF extension is relevant but dangerous. SimpleWebAuthn’s own PRF documentation warns that PRF ties encryption access to a user’s passkey and that deleting the passkey can cause loss of access to data encrypted from the PRF seed. It also notes that PRF can request sufficiently random bytes associated with a user’s passkey, useful as input to encryption flows such as HKDF. ([simplewebauthn.dev][3]) The SDK must therefore support PRF as an optional capability, not as an unconditional assumption. Yubico’s PRF guidance also emphasizes checking browser/platform support before attempting PRF use. ([Yubico Developers][4])

---

# 6. Required high-level architecture

## 6.1 Actors

The system has at least five relevant actors/components:

```text
1. Client app
   Runs in browser, mobile web, native wrapper, or embedded app environment.
   Handles wallet setup UX, passkey ceremonies, transaction review, recovery UX.

2. Passkey / authenticator
   Provides user verification and authentication.
   May unlock or help derive access to user-side wallet material.

3. App server / signing server
   Enforces policy.
   Holds server signing share.
   Participates in threshold signing.
   Must never receive or reconstruct the full wallet private key.

4. Cubid recovery provider
   Stores recovery material that is writeable during setup and readable only after user-authorized Cubid recovery.
   Must not participate in normal signing.

5. Host application
   The external app embedding the SDK.
   Examples: SmarTrust, marketplace, escrow app, DAO bounty platform, AI-agent commerce platform.
```

## 6.2 Normal signing path

Normal signing must follow this conceptual path:

```text
User initiates transaction in host app.

Host app creates transaction intent.

Server validates policy.

Server creates challenge bound to:
  wallet ID
  transaction digest
  transaction intent hash
  chain/app context
  expiry
  nonce
  policy decision

User approves with passkey.

Client unlocks or accesses user signing share.

Server verifies passkey assertion.

Client and server perform threshold signing.

Transaction signature is returned.

Full private key is never reconstructed.
Cubid is not involved.
```

The transaction intent must be human-reviewable and policy-checkable. It should not be a raw opaque hash unless there is no better option.

## 6.3 Recovery path

Recovery must follow this conceptual path:

```text
User loses device, local wallet material, or passkey access.

User starts recovery in host app.

Server creates recovery session.

User completes Cubid recovery.

Cubid releases recovery material to the user/client, not silently to the backend.

Client restores user signing share or derives replacement user-share material.

User registers a new passkey.

Client creates new passkey protection envelope.

Client refreshes Cubid recovery bundle.

Server revokes or disables stale credential paths.

Server applies post-recovery policy:
  cooldown
  notifications
  reduced limits
  manual review for high-value accounts
```

Recovery should recreate the passkey/device signing path and should rotate or mark old material stale.

## 6.4 Passkey portability path

The SDK must support the case where a passkey has been synced or ported from one device to another, such as through a platform account.

There are two cases:

```text
Case A: PRF or equivalent portable unlock works.
  User authenticates with synced passkey.
  Client derives/unlocks user-share envelope.
  Server applies new-device policy.
  User can sign normally.

Case B: Passkey authentication works, but wallet material cannot be unlocked.
  User can log in.
  User cannot sign yet.
  Route to Cubid recovery to restore/re-enroll wallet material.
```

The SDK must not falsely promise that every synced passkey can unlock wallet-share material. It should capability-detect and degrade gracefully.

---

# 7. Package family

The recommended package family is:

```text
@cubid/recoverable-wallet-core
@cubid/recoverable-wallet-passkey
@cubid/recoverable-wallet-recovery
@cubid/recoverable-wallet-react
@cubid/recoverable-wallet-evm
@cubid/recoverable-wallet-solana
@cubid/recoverable-wallet-server
```

Optional future packages:

```text
@cubid/recoverable-wallet-wagmi
@cubid/recoverable-wallet-viem
@cubid/recoverable-wallet-rn
@cubid/recoverable-wallet-next
@cubid/recoverable-wallet-policy
@cubid/recoverable-wallet-testing
```

Do not create a single monolithic package unless the first release must be extremely small. Even then, design the internals as if these modules will be split later.

---

# 8. Package responsibilities

## 8.1 `@cubid/recoverable-wallet-core`

This is the protocol and type foundation.

Responsibilities:

```text
Define core wallet types.
Define transaction intent types.
Define wallet lifecycle states.
Define signing session types.
Define recovery session types.
Define provider interfaces.
Define common errors.
Define event names.
Define serialization rules.
Define version metadata.
```

This package should have minimal dependencies.

It should not know about React.

It should not know about Cubid-specific APIs beyond generic provider interfaces.

It should not contain threshold signing implementation.

Suggested conceptual types:

```text
WalletId
UserId
CredentialId
TransactionIntent
SigningSession
RecoverySession
WalletPolicy
PasskeyEnvelope
RecoveryBundleRef
UserSigningShareRef
ServerSigningShareRef
WalletProviderConfig
RecoveryProvider
PasskeyProvider
SigningServerClient
ChainAdapter
```

## 8.2 `@cubid/recoverable-wallet-passkey`

This package wraps passkey/WebAuthn flows.

Responsibilities:

```text
Register passkeys.
Authenticate with passkeys.
Handle WebAuthn ceremony inputs/outputs.
Integrate SimpleWebAuthn browser helpers.
Support PRF capability detection.
Create passkey envelope requests.
Validate browser capability.
Normalize credential metadata.
Expose ergonomic passkey provider interface.
```

This package should treat PRF as optional and should surface capability results clearly:

```text
prfSupported: true | false | unknown
credentialDeviceType: singleDevice | multiDevice | unknown
credentialBackedUp: true | false | unknown
```

It should not implement wallet signing.

It should not assume passkey private keys are exportable.

## 8.3 `@cubid/recoverable-wallet-recovery`

This package handles Cubid recovery integration.

Responsibilities:

```text
Create Cubid recovery bundle.
Write recovery bundle to Cubid.
Start recovery session.
Receive user-authorized recovery material.
Rotate recovery bundle.
Invalidate stale recovery refs.
Provide CubidRecoveryProvider implementation.
```

Important rule:

```text
The app backend may know that a Cubid recovery object exists,
but must not be able to read the recovery material through backend credentials alone.
```

The recovery provider should be generic enough that future providers can be added.

## 8.4 `@cubid/recoverable-wallet-react`

This package exposes UX-level hooks and components.

Responsibilities:

```text
useCreateRecoverableWallet()
useRegisterPasskey()
useRecoverWallet()
useStartSigningSession()
useSignTransaction()
useWalletStatus()
usePasskeyCapabilities()
useRecoveryStatus()
useRotateWalletMaterial()
```

It may also provide optional UI components:

```text
RecoverableWalletButton
PasskeyPrompt
RecoveryPrompt
WalletStatusBadge
NewDeviceWarning
PostRecoveryCooldownNotice
TransactionReviewCard
```

These components should be optional and themeable. The SDK should not force a visual design on host apps.

## 8.5 `@cubid/recoverable-wallet-evm`

This package adapts the core wallet to EVM.

Responsibilities:

```text
EVM transaction intent schema.
EIP-712 typed-data intent support.
Viem adapter.
Wagmi adapter in separate package or optional export.
Chain ID validation.
Contract-call display metadata.
ERC-20 transfer metadata.
Escrow-specific transaction descriptions for SmarTrust.
```

This package should be transaction-intent oriented, not raw-private-key oriented.

For SmarTrust, it should eventually understand escrow actions such as funding, milestone approval, payout proposal, dispute opening, adjudication prefund, and contract deployment. SmarTrust’s contracts already use roles and stateful actions such as funding, starting work, opening disputes, assigning adjudicators, and closing through adjudication or sweep flows. 

## 8.6 `@cubid/recoverable-wallet-solana`

This package adapts the core wallet to Solana.

Responsibilities:

```text
Solana transaction/message intent schema.
Instruction-level display metadata.
Program allowlist support.
Token transfer interpretation.
Signing-session integration.
```

It should be optional at first if the immediate priority is EVM.

## 8.7 `@cubid/recoverable-wallet-server`

This package supports backend integration but must be carefully bounded.

Responsibilities:

```text
Signing-session schema validation.
Challenge generation helpers.
Transaction intent hash verification.
Passkey assertion verification integration.
Policy decision typing.
Recovery session typing.
Webhook/event typing.
Audit log typing.
```

It should not casually handle server signing shares.

Server signing-share management belongs in a hardened threshold-signing service, not a normal application helper package.

This package can help the server coordinate sessions, but it should not make developers think “npm install” is enough to securely operate a signing-share custodian.

---

# 9. Dependencies

## 9.1 Recommended direct dependencies

Use these as building blocks:

```text
@simplewebauthn/browser
@simplewebauthn/server
viem
zod or valibot for schema validation
typescript
```

SimpleWebAuthn should be the default WebAuthn ceremony dependency, because it provides the browser/server split needed by this architecture and aligns with server-side registration and authentication verification flows. ([simplewebauthn.dev][2])

Use schema validation for all externally passed objects:

```text
transaction intents
signing session requests
recovery session requests
wallet metadata
passkey metadata
provider configs
```

## 9.2 Optional / adapter dependencies

Consider these only in adapter packages:

```text
wagmi
@tanstack/react-query
ethers, only if needed for compatibility
Solana web3 libraries
webauthn-p256 or ox/WebAuthnP256 for specialized EVM/passkey integrations
```

Do not make React, wagmi, or ethers required dependencies of the core package.

## 9.3 Cryptography dependencies

The agent must not choose or implement threshold signing casually.

The architecture requires:

```text
audited threshold signing / MPC implementation
chain-appropriate curve support
secure server signing-share storage
share refresh / rotation support
test vectors
formal or third-party review if possible
```

The agent should identify candidate libraries or providers, but final selection should require a separate security review.

---

# 10. Architecture modules

## 10.1 Client SDK module

Purpose:

```text
Coordinate wallet setup, passkey ceremonies, transaction review, signing sessions, and recovery flows.
```

Responsibilities:

```text
Call host backend.
Call Cubid recovery provider.
Run passkey ceremony.
Ask chain adapter to build transaction intent.
Ask signing server to create signing session.
Participate in threshold-signing protocol through an abstract signer interface.
Never expose full private key.
```

## 10.2 Host app backend module

Purpose:

```text
Own application policy and user state.
```

Responsibilities:

```text
Validate user session.
Validate transaction intent.
Create passkey challenge.
Verify passkey assertion.
Open signing session.
Ask threshold signing service to participate.
Apply limits and risk rules.
Coordinate recovery session.
Emit audit logs.
```

## 10.3 Threshold signing service

Purpose:

```text
Hold and use server signing share without exposing it to app code.
```

Responsibilities:

```text
Securely store server signing share.
Participate in signing.
Never export server signing share to client.
Never reconstruct full wallet key.
Support key/share rotation.
Support policy-gated signing.
Support audit logging.
```

This service may be internal, HSM-backed, cloud-KMS-assisted, or provided by a specialist MPC provider. The SDK spec should remain provider-abstract.

## 10.4 Cubid recovery service

Purpose:

```text
Store and release user-side recovery material only after user-authorized Cubid recovery.
```

Responsibilities:

```text
Accept backup material at wallet creation.
Prevent backend-only reads.
Release material to user/client after strong recovery.
Support recovery-bundle rotation.
Support stale bundle invalidation.
Provide recovery audit events.
```

## 10.5 Chain adapter

Purpose:

```text
Translate app actions into chain-specific transaction intents and signing payloads.
```

Responsibilities:

```text
Produce human-reviewable summaries.
Produce policy-checkable metadata.
Normalize chain IDs and assets.
Support transaction-intent hashing.
Prevent opaque signing whenever possible.
```

---

# 11. Wallet lifecycle states

The SDK should model wallet lifecycle explicitly. Recommended conceptual states:

```text
uninitialized
creating
active
signing
recovery_pending
recovering
recovered_pending_reenrollment
active_post_recovery_limited
suspended
disabled
rotating
error
```

Do not hide recovery state. Host apps need to display clear warnings when a wallet is in recovery, post-recovery cooldown, or new-device limited mode.

This mirrors SmarTrust’s broader state-machine discipline, where contract state transitions are explicit and forward-moving. 

---

# 12. Required flows

## 12.1 Wallet creation

The agent should specify this flow:

```text
1. Host app user chooses “Create app-recoverable wallet.”

2. Client starts wallet creation session with backend.

3. Backend creates wallet creation challenge and policy context.

4. Client registers passkey.

5. Client creates wallet signing material.

6. Client splits material into:
   user signing share
   server signing share

7. Client sends server signing share to threshold signing service through approved channel.

8. Client protects user signing share with passkey-controlled envelope.

9. Client creates Cubid recovery bundle for user signing share.

10. Client writes recovery bundle to Cubid.

11. Backend stores wallet metadata:
    wallet ID
    public address
    credential ID(s)
    Cubid recovery reference
    signing-share reference
    policy profile
    lifecycle state

12. Client wipes temporary setup material.
```

The agent should not specify the exact cryptographic ceremony unless working with a selected audited MPC library.

## 12.2 Normal signing

The agent should specify this flow:

```text
1. Host app builds action:
   fund escrow, approve payout, open dispute, transfer token, etc.

2. Chain adapter converts action into transaction intent.

3. Backend validates transaction intent.

4. Backend creates signing session and passkey challenge.

5. User reviews action.

6. User approves with passkey.

7. Client unlocks user signing share.

8. Backend verifies passkey assertion.

9. Server signing service participates with server signing share.

10. Threshold signing protocol outputs chain signature.

11. Transaction is broadcast.

12. Audit logs are written.
```

For SmarTrust-specific actions, the transaction review should be contextual, not raw:

```text
“Approve milestone payout”
“Fund escrow”
“Open dispute”
“Prefund adjudication”
“Release remainder”
```

## 12.3 New-device passkey flow

The agent should specify this flow:

```text
1. User opens host app on new device.

2. User authenticates with synced passkey.

3. SDK checks whether passkey can unlock required user-share envelope.

4. If yes:
   user can sign under new-device policy.

5. If no:
   user is authenticated but wallet signing material is unavailable.
   route to Cubid recovery.
```

The product copy must be honest:

```text
“We found your passkey, but this device does not yet have the wallet material needed for signing. Verify with Cubid once to restore signing on this device.”
```

## 12.4 Lost device/passkey recovery

The agent should specify this flow:

```text
1. User selects wallet recovery.

2. Backend marks wallet recovery_pending.

3. Backend creates recovery session.

4. User completes Cubid verification.

5. Cubid releases recovery material to client.

6. Client restores user signing share.

7. User registers new passkey.

8. Client creates new passkey envelope.

9. Client rotates Cubid recovery bundle.

10. Backend disables stale credential paths.

11. Backend applies post-recovery policy.

12. Wallet returns to active or active_post_recovery_limited.
```

---

# 13. Policy model

The SDK should define policy hooks but not hardcode every business rule.

Policy should include:

```text
allowed chains
allowed contracts
allowed methods/selectors
transaction value limits
daily limits
new-device limits
post-recovery limits
velocity limits
destination risk
recovery cooldown
manual review requirement
Cubid step-up requirement
user notification policy
audit log retention policy
```

For SmarTrust, policy should map to escrow contract realities:

```text
buyer/seller/admin/adjudicator role
escrow state
funding status
started status
dispute status
adjudication status
prefund status
payout proposal status
template type
chain
asset allowlist
```

The contracts already distinguish roles such as buyer, seller, admin, adjudicator, registry owner, factory, token manager, and deployer.  The SDK’s policy layer should use those distinctions instead of treating every transaction as a generic wallet action.

---

# 14. Provider interfaces

The agent should design provider boundaries around concepts, not around implementation details.

## 14.1 Recovery provider

Conceptual interface:

```text
RecoveryProvider
  createRecoveryBundle
  startRecoverySession
  recoverUserShare
  rotateRecoveryBundle
  revokeRecoveryBundle
  getRecoveryStatus
```

Rules:

```text
Cubid is the default provider.
Provider must not return recovery material to backend-only callers.
Provider must provide session identity and audit references.
Provider must support bundle rotation.
```

## 14.2 Passkey provider

Conceptual interface:

```text
PasskeyProvider
  register
  authenticate
  getCapabilities
  createEnvelope
  unlockEnvelope
  listCredentials
```

Rules:

```text
Must support passkey authentication.
Should support PRF when available.
Must gracefully degrade when PRF is unavailable.
Must expose credential metadata where available.
```

## 14.3 Signing server client

Conceptual interface:

```text
SigningServerClient
  createWalletSession
  createSigningSession
  verifySigningSession
  participateInSigning
  startRecoverySession
  completeRecoverySession
  rotateWalletMaterial
  getWalletStatus
```

Rules:

```text
Must not expose server signing share.
Must bind challenges to transaction intent.
Must provide policy decision metadata.
Must produce audit events.
```

## 14.4 Chain adapter

Conceptual interface:

```text
ChainAdapter
  buildTransactionIntent
  hashTransactionIntent
  renderTransactionSummary
  validateIntent
  prepareSigningPayload
  broadcastTransaction
```

Rules:

```text
Prefer human-readable intents.
Avoid signing opaque hashes.
Preserve chain-specific details.
Support policy metadata extraction.
```

---

# 15. Naming and package positioning

The package should be published under `@cubid/*` for early clarity, but architected with provider interfaces.

Recommended naming:

```text
@cubid/recoverable-wallet-core
@cubid/recoverable-wallet-passkey
@cubid/recoverable-wallet-recovery
@cubid/recoverable-wallet-react
@cubid/recoverable-wallet-evm
@cubid/recoverable-wallet-server
```

External positioning:

```text
Cubid Recoverable Wallet SDK
Passkey-first assisted self-custody for apps
Recovery through user-authorized Cubid secret storage
Policy co-signing without full server custody
```

Avoid:

```text
Cubid Custody
Cubid MPC Custody
Managed Wallet Custody
Server-controlled wallet
```

Recommended product sentence:

```text
Cubid Recoverable Wallet SDK lets apps create passkey-first wallets where normal signing requires user approval plus app policy, and recovery is possible through Cubid without giving the app server full private-key custody.
```

---

# 16. Documentation requirements

The agent should produce documentation for:

```text
Architecture overview
Custody model
Threat model
Package overview
Wallet creation flow
Normal signing flow
Recovery flow
Passkey portability flow
Server integration guide
Cubid recovery provider guide
EVM adapter guide
React quickstart
Policy model
Security checklist
Glossary
FAQ
```

The docs must clearly distinguish:

```text
Authentication vs signing
Passkey credential vs wallet key
Cubid recovery material vs full private key
Server signing share vs custodial private key
Normal signing vs recovery
PRF-supported flow vs PRF-unavailable fallback
```

---

# 17. Security invariants

The agent must preserve these invariants in every design artifact:

```text
1. The app server never reconstructs the full wallet private key.

2. The app server alone cannot sign transactions.

3. Cubid alone cannot sign transactions.

4. Device/passkey alone cannot sign transactions.

5. Cubid is not involved in normal signing.

6. Cubid recovery material is released only after user-authorized recovery.

7. Backend credentials alone cannot retrieve Cubid recovery material.

8. Normal signing requires user approval plus server policy approval.

9. Recovery requires Cubid verification plus server policy approval.

10. After recovery, stale passkey/device material is rotated, disabled, or marked stale.

11. Signing challenges are bound to transaction intent, wallet ID, policy decision, nonce, and expiry.

12. The SDK must not encourage raw opaque hash signing when a structured intent can be used.

13. The SDK must not hand-roll threshold cryptography.
```

---

# 18. Threat model

The agent should reason about at least these threats:

```text
Server compromise
Client compromise
Browser extension compromise
Session token theft
Passkey synced-account compromise
Cubid recovery compromise
Recovery social engineering
Malicious host app integration
Transaction-intent substitution
Replay attack
New-device abuse
Supply-chain attack in npm package
Threshold signing service compromise
```

For each threat, documentation should state:

```text
What the attacker has.
What the attacker still lacks.
Which invariant protects the user.
What mitigation applies.
What residual risk remains.
```

Be honest about residual risks. In particular:

```text
If the client runtime is malicious, it may misuse user-side share access.
Threshold signing limits damage because server policy is still required.
If the server policy layer is also compromised, risk increases.
If Cubid recovery is socially engineered and server policy is weak, recovery can be abused.
```

---

# 19. Explicit non-goals

Do not design for these as primary goals:

```text
Fully decentralized recovery without app/server.
User-controlled seed phrase export as default UX.
Serverless wallet portability equivalent to MetaMask.
Cubid participating in every transaction.
Raw Shamir-based private-key reconstruction as normal signing.
A generic MPC library implemented from scratch.
A custodial wallet where server can move funds alone.
```

These may be future optional considerations, but they are not the core product.

---

# 20. Agent operating instructions

When working on this project, the agent must:

```text
1. Start from the custody invariants.

2. Keep package boundaries clean.

3. Prefer provider interfaces over hardcoded vendor logic.

4. Treat Cubid as the default recovery provider, not the only conceivable provider.

5. Treat SimpleWebAuthn as the WebAuthn ceremony layer, not the wallet layer.

6. Treat PRF as optional and risky.

7. Avoid low-level crypto implementation unless explicitly scoped and reviewed.

8. Prefer transaction-intent design over raw signature plumbing.

9. Make all recovery flows explicit.

10. Make all post-recovery risk controls visible.

11. Write docs that an external app developer can understand.

12. Keep SmarTrust-specific assumptions out of core where possible, but support them through adapters.

13. Never imply the server can custody funds.

14. Never imply Cubid can move funds.

15. Never imply passkeys are exportable wallet keys.
```

---

# 21. Desired deliverables from the agent

The agent should produce, in order:

```text
1. Architecture brief
2. Package dependency map
3. Package structure proposal
4. Provider interface specification
5. Wallet lifecycle state model
6. Normal signing flow
7. Recovery flow
8. Passkey portability flow
9. Threat model
10. Documentation outline
11. Integration guide for SmarTrust
12. Integration guide for a generic external app
13. Security review checklist
14. Release plan
```

The first version should avoid implementation details beyond what is needed to make architecture decisions.

---

# 22. First release scope

Recommended v0.1 scope:

```text
@cubid/recoverable-wallet-core
@cubid/recoverable-wallet-passkey
@cubid/recoverable-wallet-recovery
@cubid/recoverable-wallet-react
@cubid/recoverable-wallet-evm
```

v0.1 should support:

```text
wallet metadata model
passkey registration/authentication orchestration
Cubid recovery provider abstraction
transaction intent model
EVM adapter
React hooks
server API schema
normal signing session orchestration
recovery session orchestration
```

v0.1 may defer:

```text
Solana
Wagmi-specific adapter
advanced UI components
multiple recovery providers
multi-passkey household/team recovery
hardware-key-specific flows
full policy engine implementation
```

---

# 23. Quality bar

The SDK is acceptable only if an external developer can answer:

```text
What does the server hold?
What does the user hold?
What does Cubid hold?
What happens during normal signing?
What happens if the user loses their device?
What happens if the passkey syncs to a new device?
Can the server move funds alone?
Can Cubid move funds alone?
Is Cubid used during normal signing?
What are the recovery risks?
What does the SDK not protect against?
```

If the docs cannot answer those questions plainly, the spec is not done.

---

# 24. Summary instruction

Build a Cubid-branded but provider-abstract recoverable wallet SDK.

The architecture is:

```text
Passkey for normal user approval.
Server share for policy co-signing.
Cubid for recovery only.
Threshold signing for no full server custody.
Transaction intents for safe review and policy enforcement.
Provider-based npm packages for external app adoption.
```

Do not build a custodial wallet.
Do not build a raw private-key reconstruction wallet.
Do not build a fully decentralized seed-phrase replacement.
Build the clean middle path: **app-mediated, passkey-first, Cubid-recoverable assisted self-custody.**

---

# Appendix: Sources

[1]: https://www.w3.org/TR/webauthn-3/ "Web Authentication: An API for accessing Public Key Credentials - Level 3"
[2]: https://simplewebauthn.dev/docs/packages/server "@simplewebauthn/server | SimpleWebAuthn"
[3]: https://simplewebauthn.dev/docs/advanced/prf "PRF | SimpleWebAuthn"
[4]: https://developers.yubico.com/WebAuthn/Concepts/PRF_Extension/Developers_Guide_to_PRF.html "Developers Guide to PRF"
