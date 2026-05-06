# SIWC Roadmap: Sign In With Cubid

Sign In With Cubid is the passkey-first, privacy-preserving, app-scoped identity and wallet-adjacent platform layer for Cubid. The product should combine OIDC login, hosted Passport UX, Admin policy controls, app-scoped identity, selective disclosure, proof-of-personhood signals, and optional app-scoped custody accounts without becoming a generic embedded-wallet clone.

Source note: this file replaces a generic competitor-research implementation guide with a repo-grounded side roadmap. It should stay separate from `agent-context/todo.md` until the team chooses which SIWC work to promote into the main execution backlog.

## Current Repo Truth

- OIDC issuer work is already substantially implemented: dynamic registration, Authorization Code + PKCE, `/token`, `/userinfo`, JWKS, revoke/logout, pairwise subjects, passkey ACR, TCOIN-oriented seed/config artifacts, and issuer operations views exist in the monorepo.
- Passkey work is already substantially implemented: Passport login UX, fallback/recovery framing, passkey registration, device lifecycle, rename/revoke, Profile visibility, Admin read-only passkey ops, and passkey-required ACR semantics exist.
- App-scoped identity and selective disclosure are now first-class backend concepts: app-scoped subjects, disclosure grants, Allow Page persistence, OIDC consent persistence, SDK-facing route filtering, webhook filtering, non-OIDC disclosure history/revocation, and Admin disclosure ops exist.
- API v3 custody exists for encrypted dapp-user secrets and generated app-scoped blockchain accounts across EVM, NEAR, Solana, and Sui. Private material is stored through Supabase Vault-backed envelope encryption and is not returned to dapps, browsers, or Admin list views.
- The important SIWC product gap is signing. Generated app-scoped accounts can be created and listed, but Cubid does not yet expose message signing, transaction approval, signing policy evaluation, signer recovery, transaction simulation, or smart-account/session-key flows.
- Public SDK and UI package implementation belongs in `Cubid-Me/cubid-sdk`, not this repo. This repo owns backend behavior, migrations, Passport/Admin/OIDC runtime, API/webhook contracts, and handoff notes for SDK agents.

## Recommended Direction

Keep Login with Cubid centered on standards and privacy: OIDC for sign-in, Passport for hosted human auth and consent UX, Admin for policy and client control, and API v3 for backend app integration. Treat wallets/accounts as app-scoped custody accounts by default, not universal identities. The strongest Cubid positioning is not "Privy or Magic with different branding"; it is app-scoped identity, passkey-first authentication, proof-of-personhood signals, selective disclosure, and optional app-scoped account custody that avoids cross-app correlation.

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

- Status: Started
- Timestamp started: 2026-05-06T08:31:22Z
- Timestamp completed: TBD
- Feature branch: codex/siwc-roadmap-cleanup
- Head: TBD
- Session-log reference(s): session: v165

Implement the backend lifecycle for signing requests after SIWC01 chooses the architecture. Add API v3 routes for creating a signing request, reading request status, approving or rejecting through Passport, and returning the resulting signature or transaction hash when complete. Requests must be app-scoped, dapp-authenticated, idempotent where appropriate, bound to a specific `dapp_user_uuid` and `user_account_id`, and checked against Admin signing policy before user approval. Approval should be hosted in Passport and require passkey step-up when policy or ACR requires it. Responses must never return private keys, raw decrypted material, Vault wrapping keys, or internal human subject keys. All state changes should write audit/security events and be safe to retry.

### SIWC05. Add transaction risk, policy evaluation, and passkey step-up

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Add the first transaction-policy and risk layer before broad transaction signing is considered production-ready. The initial version can be conservative: human-readable request summaries, chain/account matching, requested operation type, recipient or contract metadata where available, amount thresholds, contract allowlist checks, and mandatory passkey step-up for high-risk requests. The goal is not full transaction simulation across every chain in v1; it is to prevent blind signing from becoming the default. Passport approval screens should make the app, chain, public account, action, and risk posture clear. Admin should be able to configure policy strictness. Failed policy checks, rejected approvals, and passkey step-up failures should be auditable and webhook-eligible.

### SIWC06. Add signing and wallet webhook contracts plus SDK handoff notes

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Extend the API v3 webhook contract for app-scoped custody and signing events. Candidate events include `wallet.created`, `wallet.signing_request.created`, `wallet.signing_request.approved`, `wallet.signing_request.rejected`, `wallet.signature.completed`, `wallet.transaction.submitted`, `wallet.transaction.failed`, and `wallet.policy.denied`. Payloads must follow the existing API v3 webhook direction: stable event IDs, timestamps, HMAC signatures, replay-safe delivery semantics, retry metadata, and disclosure-safe payloads that do not leak cross-app identifiers or custody secrets. Because these events affect developer-facing SDK behavior, each implemented contract change must create a handoff note in the public SDK repo. Do not add SDK implementation code to `cubid-passport`.

### SIWC07. Evaluate smart-account, session-key, and paymaster roadmap

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Evaluate whether Cubid should support smart accounts, scoped session keys, and paymaster/gas sponsorship after the basic signing lifecycle is secure. This should be a design and sequencing task, not an implementation shortcut. Compare the app-scoped privacy model against user expectations for portable wallets, recovery, gasless onboarding, and asset fragmentation. Decide whether smart accounts should wrap existing app-scoped custodial keys, replace generated EOAs for some chains, or remain a later optional custody mode. Define what would need to change in Admin policy, Passport approval UX, API v3 signing routes, webhook events, and SDK contracts. The output should be a recommendation with explicit "not yet" criteria if the platform is not ready.

### SIWC08. Build production readiness runbook for SIWC custody and signing

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Create the operator runbook for SIWC custody and signing before exposing signing broadly. The runbook should cover Vault key ownership and rotation, generated-account custody boundaries, migration rollback, audit-log inspection, signing request triage, webhook replay, incident response, abuse monitoring, emergency app suspension, user support, and privacy review for app-scoped account visibility. It should explicitly document what is safe to expose to users and dapps, what is Admin-only, what is service-role-only, and what must never leave server memory. Include local/staging/prod environment requirements, smoke tests, and launch blockers. This todo should close the gap between a technically working signer and an operable platform surface.

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
