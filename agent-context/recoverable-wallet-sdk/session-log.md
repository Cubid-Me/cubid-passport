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
