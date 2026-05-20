# Recoverable Wallet SDK Session Log

## Sessions

### session: rw-v1

- timestamp: 2026-05-20T18:46:01Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`bd9de8e`**
- session name: **Create recoverable wallet planning surface**

#### Objective

Create the feature-folder planning surface for Cubid's corrected wallet
direction: passkey-first, app-mediated, recoverable embedded wallets with Cubid
as recovery provider only.

#### Actions Taken

- preserved the recoverable wallet SDK agent specification
- created this feature-folder session log
- created a recoverable-wallet todo roadmap that supersedes the old Cubid
  generated-wallet and normal-signing direction

#### Validation

- `git diff --check`

#### Follow-up

- implement `RW02` to hard-disable legacy generation/signing routes, then
  proceed toward recovery-bundle storage and release APIs

### session: rw-v2

- timestamp: 2026-05-20T18:53:34Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`8593e12`**
- session name: **Close RW01 and RW02**

#### Objective

Record the completed target-state adoption and legacy route quarantine work,
then start the recovery-bundle schema slice.

#### Actions Taken

- marked `RW01` complete after the recoverable-wallet direction docs and
  roadmap landed
- marked `RW02` complete after account generation, signing request creation,
  and Passport signing approval were hard-disabled
- started `RW03` for recovery-bundle storage schema work on the same branch

#### Verification

- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/admin test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/admin typecheck`
- `pnpm --filter @cubid/passport build`
- `pnpm --filter @cubid/admin build`
- `git diff --check`

#### Follow-up

- implement `RW03` by adding private-schema recovery-bundle storage and
  Supabase Vault envelope-encryption support

### session: rw-v3

- timestamp: 2026-05-20T19:07:55Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`a2b82d8`**
- session name: **Implement RW03 recovery-bundle storage**

#### Objective

Add the private-schema storage and encryption foundation for app-mediated
recoverable wallet bundles.

#### Actions Taken

- added a Supabase migration for
  `private.recoverable_wallet_recovery_bundles`
- added the Vault helper function
  `get_recoverable_wallet_recovery_bundle_wrapping_key_v1`
- added server-side recovery-bundle envelope encryption/decryption helpers
- documented the required Vault secret and service-role-only storage contract
- added focused helper tests for round trip, wrong context, and wrong key
  rejection

#### Verification

- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `git diff --check`

#### Follow-up

- start `RW04` by adding API v3 recovery-bundle enrollment and status routes

### session: rw-v4

- timestamp: 2026-05-20T19:08:29Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`bcb2c37`**
- session name: **Start RW04 recovery-bundle APIs**

#### Objective

Start the API v3 recovery-bundle enrollment and status route slice after the
private storage foundation landed.

#### Actions Taken

- recorded the `RW03` implementation head
- marked `RW04` started on the same feature branch

#### Verification

- not run; metadata handoff before implementation

#### Follow-up

- implement dapp-authenticated recovery-bundle enroll and status routes without
  exposing decrypted bundle material

### session: rw-v5

- timestamp: 2026-05-20T19:12:59Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`bcb2c37`**
- session name: **Implement RW04 recovery-bundle APIs**

#### Objective

Add the API v3 enrollment and status surface for app-mediated recoverable wallet
bundles without creating wallets, signing transactions, or exposing recovery
material.

#### Actions Taken

- added dapp-authenticated `/api/v3/recovery-bundles/enroll`
- added dapp-authenticated `/api/v3/recovery-bundles/status`
- encrypted enrollment bundle material into
  `private.recoverable_wallet_recovery_bundles`
- returned only safe bundle status metadata to dapps
- documented the recovery-bundle API contract
- added route tests for encrypted storage, safe status responses, ownership
  checks, and idempotent enrollment replay

#### Verification

- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`

#### Follow-up

- start `RW05` by adding a user-authorized recovery release flow

### session: rw-v6

- timestamp: 2026-05-20T19:13:33Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`9dbc7e3`**
- session name: **Start RW05 recovery release flow**

#### Objective

Start the user-authorized recovery release slice after API v3 recovery-bundle
enrollment and status landed.

#### Actions Taken

- recorded the `RW04` implementation head
- marked `RW05` started on the same feature branch

#### Verification

- not run; metadata handoff before implementation

#### Follow-up

- implement Passport-hosted recovery release sessions with user verification,
  expiry, one-time release, and browser/client-path-only payload delivery

### session: rw-v7

- timestamp: 2026-05-20T19:17:18Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`558429f`**
- session name: **Implement RW05 user-authorized recovery release**

#### Objective

Add the first user-authorized recovery release flow while keeping backend dapp
credentials unable to retrieve recovery material.

#### Actions Taken

- added service-role-only recovery release session storage
- added dapp-authenticated release-session creation for active recovery bundles
- added Passport user-authenticated release completion
- enforced expiry, one-time consumption, and wrong-user denial
- returned bundle material only through the verified Passport user route
- documented the release start and completion contracts
- added Passport tests for session start, verified release, replay denial,
  wrong-user denial, and expiry denial

#### Verification

- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`

#### Follow-up

- start `RW06` for recovery rotation and revocation

### session: rw-v8

- timestamp: 2026-05-20T19:17:50Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`9186853`**
- session name: **Start RW06 recovery rotation and revocation**

#### Objective

Start the recovery bundle lifecycle-management slice after user-authorized
release landed.

#### Actions Taken

- recorded the `RW05` implementation head
- marked `RW06` started on the same feature branch

#### Verification

- not run; metadata handoff before implementation

#### Follow-up

- add dapp-authenticated rotation/revocation APIs plus safe user/Admin
  visibility and lifecycle audit events

### session: rw-v9

- timestamp: 2026-05-20T19:21:16Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`154f668`**
- session name: **Implement RW06 recovery lifecycle controls**

#### Objective

Add recovery bundle rotation, revocation, user-visible lifecycle state, and
audit events without exposing recovery material or encrypted custody fields.

#### Actions Taken

- added dapp-authenticated recovery bundle rotation
- added dapp-authenticated recovery bundle revocation
- added Passport user-authenticated recovery bundle list visibility
- added recovery lifecycle audit events for enroll, update, release, rotate,
  and revoke
- documented lifecycle routes and redaction requirements
- added Passport tests for rotation, revocation, user visibility, redaction, and
  lifecycle audit events

#### Verification

- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`

#### Follow-up

- start `RW07` for the browser-safe recovery error taxonomy

### session: rw-v10

- timestamp: 2026-05-20T19:21:49Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`0afeb5e`**
- session name: **Start RW07 recovery error taxonomy**

#### Objective

Start the browser-safe recovery error taxonomy slice after recovery lifecycle
controls landed.

#### Actions Taken

- recorded the `RW06` implementation head
- marked `RW07` started on the same feature branch

#### Verification

- not run; metadata handoff before implementation

#### Follow-up

- standardize recovery error codes in docs and backend constants, then send the
  SDK-facing handoff through cross-repo comms

### session: rw-v11

- timestamp: 2026-05-20T19:26:38Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`9a86130`**
- session name: **Implement RW07 recovery error taxonomy**

#### Objective

Standardize browser-safe recovery error codes and coordinate the SDK impact
without adding public SDK implementation to this repo.

#### Actions Taken

- added shared backend constants for recoverable-wallet error codes
- updated recovery routes to emit specific app-context, bundle-not-found,
  consumed, expired, wrong-user, and revoked-bundle codes
- documented the taxonomy in the recoverable-wallet and API v3 engineering docs
- added a cross-repo comms note for `Cubid-Me/cubid-sdk` agents
- extended Passport tests to assert the new app-context and revoked-bundle codes

#### Verification

- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`

#### Follow-up

- start `RW08` for SDK package direction coordination
