# SIWC Roadmap: Sign In With Cubid

Sign In With Cubid is the passkey-first, privacy-preserving, app-scoped identity layer for Cubid. The older wallet-adjacent custody/signing direction in this file is now superseded for wallet generation and normal signing by `agent-context/recoverable-wallet-sdk/` and `docs/engineering/recoverable-wallet-sdk.md`.

Source note: this file replaces a generic competitor-research implementation guide with a repo-grounded side roadmap. It should stay separate from `agent-context/todo.md` until the team chooses which SIWC work to promote into the main execution backlog.

## Current Repo Truth

- OIDC issuer work is already substantially implemented: dynamic registration, Authorization Code + PKCE, `/token`, `/userinfo`, JWKS, revoke/logout, pairwise subjects, passkey ACR, TCOIN-oriented seed/config artifacts, and issuer operations views exist in the monorepo.
- Passkey work is already substantially implemented: Passport login UX, fallback/recovery framing, passkey registration, device lifecycle, rename/revoke, Profile visibility, Admin read-only passkey ops, and passkey-required ACR semantics exist.
- App-scoped identity and selective disclosure are now first-class backend concepts: app-scoped subjects, disclosure grants, Allow Page persistence, OIDC consent persistence, SDK-facing route filtering, webhook filtering, non-OIDC disclosure history/revocation, and Admin disclosure ops exist.
- API v3 custody exists for encrypted dapp-user secrets and generated app-scoped blockchain accounts across EVM, NEAR, Solana, and Sui. Private material is stored through Supabase Vault-backed envelope encryption and is not returned to dapps, browsers, or Admin list views.
- The SIWC backend foundation included app-scoped account generation/listing, Admin signing policy controls, Passport account visibility, message and typed-data signing requests, passkey step-up, transaction-risk denial evidence, signed wallet webhooks, and an operator runbook. That wallet-generation and normal-signing implementation is now quarantined as legacy because Cubid should act as recovery provider, not as the wallet generator or normal signer.
- Public SDK and UI package implementation belongs in `Cubid-Me/cubid-sdk`, not this repo. This repo owns backend behavior, migrations, Passport/Admin/OIDC runtime, API/webhook contracts, and handoff notes for SDK agents.

## Recommended Direction

Keep Login with Cubid centered on standards and privacy: OIDC for sign-in, Passport for hosted human auth and consent UX, Admin for policy and client control, and API v3 for backend app integration. Treat recoverable wallets as app-mediated assisted self-custody where Cubid supplies identity-bound recovery, not normal wallet custody. The strongest Cubid positioning is not "Privy or Magic with different branding"; it is app-scoped identity, passkey-first authentication, proof-of-personhood signals, selective disclosure, and recovery-provider infrastructure.

The generic recommendation to build new `/api/v2/wallets/*` routes should be replaced with API v3 contracts. Any SDK-visible changes must be coordinated through `Cubid-Me/cubid-sdk` by writing a handoff note in that repo; no new public SDK implementation should be added here.

## Open Todos

### SIWC01. Define the v3 signing and transaction authorization architecture

- Status: Completed
- Timestamp started: 2026-05-05T01:21:18Z
- Timestamp completed: 2026-05-05T01:23:41Z
- Feature branch: codex/siwc-roadmap-cleanup
- Head: 008934d
- Session-log reference(s): session: v160, session: v161

Design the first decision-complete signing architecture for app-scoped custody accounts. The architecture should decide whether v3 signing starts as server-side custodial signing with Supabase Vault-backed private keys, smart-account signing, a future external signer, or a phased hybrid. It must preserve the separation between authentication credentials and blockchain signing keys: passkeys authorize user intent, while wallet private keys or smart-account signer keys perform blockchain signing. Define the signing request lifecycle, approval state machine, actor model, replay/idempotency requirements, audit events, and which chains are included in the first slice. The design should explicitly say that generated accounts are not enough for SIWC wallet parity until users can safely approve signatures or transactions.

### SIWC02. Add Admin policy controls for app-scoped account custody and signing

- Status: Completed
- Timestamp started: 2026-05-05T01:23:41Z
- Timestamp completed: 2026-05-05T23:41:40Z
- Feature branch: codex/siwc-roadmap-cleanup
- Head: a968016
- Session-log reference(s): session: v161, session: v162, session: v163

Add Admin-side controls that let operators configure whether an app may request generated accounts, which chains are enabled, whether signing is enabled, and which approval rules apply. This should extend the existing Admin control-plane pattern rather than creating a separate wallet dashboard. Include fields for allowed chains, custody mode, signing status, allowed signature types, transaction limits, optional contract allowlists, required passkey ACR, webhook event subscriptions, and sandbox/production behavior. Admin list/detail views must not expose private keys, ciphertext, wrapped data keys, Vault key material, or cross-app user identifiers. This todo should also decide how policy names and versions are surfaced to API v3 responses and audit logs.

### SIWC03. Add Passport user-facing app account visibility

- Status: Completed
- Timestamp started: 2026-05-05T23:41:40Z
- Timestamp completed: 2026-05-06T08:31:22Z
- Feature branch: codex/siwc-roadmap-cleanup
- Head: 774cd64
- Session-log reference(s): session: v163, session: v164

Add user-facing visibility for app-scoped custody accounts in Passport, likely inside the existing Profile and disclosure-management surface. Users should be able to see which apps have generated accounts for them, which chain each account belongs to, public addresses, labels, creation dates, custody status, and whether signing is enabled for that app. The UI should reinforce the privacy model: these accounts are scoped to individual apps, and other apps should not be able to correlate them. This slice should not add private-key export, signing, or cross-app wallet portability. It should only make the already-created v3 account metadata understandable and auditable for the human user, with no exposure of private or encrypted custody fields.

### SIWC04. Implement v3 signing request lifecycle

- Status: Completed
- Timestamp started: 2026-05-06T08:31:22Z
- Timestamp completed: 2026-05-06T08:57:01Z
- Feature branch: codex/siwc-roadmap-cleanup
- Head: a41f6ee
- Session-log reference(s): session: v165, session: v166

Implement the backend lifecycle for signing requests after SIWC01 chooses the architecture. Add API v3 routes for creating a signing request, reading request status, approving or rejecting through Passport, and returning the resulting signature or transaction hash when complete. Requests must be app-scoped, dapp-authenticated, idempotent where appropriate, bound to a specific `dapp_user_uuid` and `user_account_id`, and checked against Admin signing policy before user approval. Approval should be hosted in Passport and require passkey step-up when policy or ACR requires it. Responses must never return private keys, raw decrypted material, Vault wrapping keys, or internal human subject keys. All state changes should write audit/security events and be safe to retry.

### SIWC05. Add transaction risk, policy evaluation, and passkey step-up

- Status: Completed
- Timestamp started: 2026-05-06T08:57:01Z
- Timestamp completed: 2026-05-06T09:22:33Z
- Feature branch: codex/siwc-roadmap-cleanup
- Head: 313f4a5
- Session-log reference(s): session: v167, session: v168

Add the first transaction-policy and risk layer before broad transaction signing is considered production-ready. The initial version can be conservative: human-readable request summaries, chain/account matching, requested operation type, recipient or contract metadata where available, amount thresholds, contract allowlist checks, and mandatory passkey step-up for high-risk requests. The goal is not full transaction simulation across every chain in v1; it is to prevent blind signing from becoming the default. Passport approval screens should make the app, chain, public account, action, and risk posture clear. Admin should be able to configure policy strictness. Failed policy checks, rejected approvals, and passkey step-up failures should be auditable and webhook-eligible.

### SIWC06. Add signing and wallet webhook contracts plus SDK handoff notes

- Status: Completed
- Timestamp started: 2026-05-06T09:22:33Z
- Timestamp completed: 2026-05-06T10:25:43Z
- Feature branch: codex/siwc-roadmap-cleanup
- Head: 82fcdd6
- Session-log reference(s): session: v169, session: v170

Extend the API v3 webhook contract for app-scoped custody and signing events. Candidate events include `wallet.created`, `wallet.signing_request.created`, `wallet.signing_request.approved`, `wallet.signing_request.rejected`, `wallet.signature.completed`, `wallet.transaction.submitted`, `wallet.transaction.failed`, and `wallet.policy.denied`. Payloads must follow the existing API v3 webhook direction: stable event IDs, timestamps, HMAC signatures, replay-safe delivery semantics, retry metadata, and disclosure-safe payloads that do not leak cross-app identifiers or custody secrets. Because these events affect developer-facing SDK behavior, each implemented contract change must create a handoff note in the public SDK repo. Do not add SDK implementation code to `cubid-passport`.

### SIWC07. Evaluate smart-account, session-key, and paymaster roadmap

- Status: Completed
- Timestamp started: 2026-05-06T10:25:43Z
- Timestamp completed: 2026-05-06T10:40:40Z
- Feature branch: codex/siwc-roadmap-cleanup
- Head: e3fec1a
- Session-log reference(s): session: v171, session: v172

Evaluate whether Cubid should support smart accounts, scoped session keys, and paymaster/gas sponsorship after the basic signing lifecycle is secure. This should be a design and sequencing task, not an implementation shortcut. Compare the app-scoped privacy model against user expectations for portable wallets, recovery, gasless onboarding, and asset fragmentation. Decide whether smart accounts should wrap existing app-scoped custodial keys, replace generated EOAs for some chains, or remain a later optional custody mode. Define what would need to change in Admin policy, Passport approval UX, API v3 signing routes, webhook events, and SDK contracts. The output should be a recommendation with explicit "not yet" criteria if the platform is not ready.

### SIWC08. Build production readiness runbook for SIWC custody and signing

- Status: Completed
- Timestamp started: 2026-05-06T10:40:40Z
- Timestamp completed: 2026-05-06T11:49:35Z
- Feature branch: codex/siwc-roadmap-cleanup
- Head: 969385a
- Session-log reference(s): session: v173, session: v174

Create the operator runbook for SIWC custody and signing before exposing signing broadly. The runbook should cover Vault key ownership and rotation, generated-account custody boundaries, migration rollback, audit-log inspection, signing request triage, webhook replay, incident response, abuse monitoring, emergency app suspension, user support, and privacy review for app-scoped account visibility. It should explicitly document what is safe to expose to users and dapps, what is Admin-only, what is service-role-only, and what must never leave server memory. Include local/staging/prod environment requirements, smoke tests, and launch blockers. This todo should close the gap between a technically working signer and an operable platform surface.

### SIWC09. Add passkey-approved account creation requests

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Add a user-approved account-generation lifecycle for apps that need "create a wallet with passkey" semantics, starting with SmarTrust. The current `/api/v3/accounts/generate` route is dapp-authenticated and policy-checked, but it does not create a Passport approval moment before account creation. This follow-up should let a dapp request account creation, show the human the requesting app, chain, label, and account intent in Passport, require a fresh passkey step-up when policy requires it, and create the app-scoped custody account only after approval. Support EVM and Solana first for SmarTrust, while keeping NEAR and Sui aligned with existing custody support. Preserve the current direct generate route for compatibility unless a later Admin policy explicitly disables direct generation.

### SIWC10. Formalize SDK-facing wallet capability discovery and account lookup

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Define the exact API and SDK-facing contract downstream apps should use for wallet capability discovery, account lookup, and address retrieval. SmarTrust asked for lookup "by Cubid identity," but Cubid should translate that into app-scoped lookup by the authenticated dapp and `dapp_user_uuid`, never raw Cubid identity or cross-app account discovery. Expose non-secret metadata describing supported chains, whether account creation is direct or passkey-approved, supported request types, transaction-signing availability, required ACR, sandbox mode, policy status, and known unsupported actions. Document the backend contract in `cubid-passport`, add tests proving account responses remain redacted, and create a handoff note for `Cubid-Me/cubid-sdk` so SDK agents can implement ergonomic helpers without adding SDK code to this repo.

### SIWC11. Harden browser-safe signing and approval error taxonomy

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Standardize stable browser-safe error codes across API v3 signing, Passport approval, and future SDK surfaces. SmarTrust escrow UX needs to distinguish user cancellation, expired requests, wrong user, missing or stale passkey step-up, unavailable credential, unsupported chain, unsupported action, policy denial, provider outage, rate limiting, and transaction signing disabled. This follow-up should map backend `ApiSecurityError` and domain errors to a documented set of public codes, update Passport approval pages to show user-safe messages, and keep internal details in logs/security events only. Add tests for representative API and Passport routes so retryable, user-actionable, and hard-block failures are stable enough for SmarTrust and other apps to build clear user flows around them.

### SIWC12. Add EVM transaction signing pilot for escrow funding paths

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Enable the first production-shaped transaction signing pilot behind explicit Admin policy, limited to EVM escrow paths needed by SmarTrust and Paytrie. Target Ethereum, Base, and Arbitrum with conservative USDC/CADC-oriented transaction support, contract allowlists, declared value limits, readable transaction summaries, fresh passkey step-up, replay-safe request handling, audit events, and wallet webhooks. Transaction signing must remain policy-denied unless a dapp policy explicitly enables the pilot for the chain, request type, and contract/value envelope. Do not expose arbitrary EVM transaction signing by default. The implementation should re-check policy immediately before signing, never return private key material, and include tests for allowed and denied transactions, stale passkey sessions, policy changes after approval, signature output, and webhook emission.

### SIWC13. Add Solana transaction-signing readiness after readable summaries

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Prepare Solana transaction signing as a separate readiness track after the EVM escrow pilot, while keeping current Solana message signing available. This follow-up should define supported Solana transaction shapes, account and chain matching, transaction parsing, human-readable summaries, simulation or dry-run strategy if available, policy checks, passkey approval requirements, safe response fields, and wallet webhook behavior. Until those pieces exist, Solana transaction signing should continue to fail closed with stable public error codes and clear risk reasons. This should not block SmarTrust's EVM/Paytrie funding path, but it is required before Cubid can honestly claim full EVM plus Solana passkey-wallet support for escrow workflows. Add tests for unsupported transaction types and eventual allowed shapes.

### SIWC14. Coordinate public SDK implementation and release

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Coordinate the public SDK work needed for SmarTrust and other integrators to consume SIWC wallet APIs without touching SDK code in this repo. Create a handoff note in `Cubid-Me/cubid-sdk` requesting helpers for account creation requests, account list/address lookup, signing-request creation/status/cancel, hosted Passport approval launch, capability discovery, and browser-safe error classes. The SDK should preserve the preferred model from the SmarTrust inbox note: the app backend requests a challenge/session, the browser completes Cubid-hosted passkey approval, and the app receives only public addresses, request statuses, signatures, or safe errors. This todo should also define release/version expectations and ensure SDK docs warn that private keys, seed material, and key shares are never exposed to consumers.

### SIWC15. Add SmarTrust integration smoke and reply note

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Close the SmarTrust inbox loop only after the required backend and SDK surfaces are available enough to unblock their fail-closed wallet scaffolding. Write a reply note into the SmarTrust repo's `agent-context/inbox/` explicitly referencing `PT-12`, `PT-14`, and `PT-15`. The note should include the API and SDK version or commit containing the feature, exact method names, required environment variables and ownership, supported wallet families, supported signing payloads, sample request and response payloads, known unsupported actions, and smoke-test guidance for EVM, Solana, and Paytrie-to-Cubid wallet funding. This todo should include at least one integration-oriented smoke pass or dry-run transcript so SmarTrust agents can proceed without guessing.

## Implemented Differently Than Generic Recommendation

- API v3 is the forward path for developer-facing backend surfaces. Do not add new `/api/v2/wallets/*` routes for SIWC.
- Public SDK and UI work belongs in `Cubid-Me/cubid-sdk`; this repo should only define backend contracts, runtime behavior, migrations, and SDK handoff notes.
- OIDC pairwise subjects and app-scoped disclosure grants are preferred over a custom token shape that embeds broad wallet, score, or PII claims.
- Supabase Vault-backed envelope encryption is the current retrievable-secret custody pattern for dapp-user secrets, webhook signing secrets, and blockchain private keys.
- Legacy `/api/v2/save_secret` plaintext writes have been removed; new dapp-user secret writes must use encrypted API v3 custody.
- Generated app-scoped accounts are not the same thing as an embedded wallet product until signing, approval, and policy controls exist.

## Deferred / Not In This Repo

- Public React components, drop-in SIWC buttons, Deno/Supabase Edge examples, and package publication belong in `Cubid-Me/cubid-sdk`.
- Competitor references are useful inspiration but should not drive repo-local implementation details unless translated into Cubid-specific OIDC, Passport, Admin, API v3, or webhook work.
- Generic embedded-wallet features such as universal wallets, key export, social-login-first onboarding, broad cross-app portability, swaps, onramps, and paymasters are deferred unless explicitly reconciled with Cubid's app-scoped privacy model.
- No new public SDK implementation code should be added under `packages/` in this repo.
