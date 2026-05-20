# Recoverable Wallet SDK Roadmap

This side roadmap supersedes the old SIWC wallet-generation and normal-signing
direction. Cubid should not be a typical third-party wallet provider. The new
target is a passkey-first, app-mediated, recoverable embedded wallet SDK where
host apps own wallet creation, threshold/MPC signing, and transaction
broadcasting, while Cubid provides identity-bound recovery-bundle custody and
release.

## Execution Protocol

- Work on a feature branch and commit each completed todo with a session-log
  entry.
- Do not add public SDK implementation code to `cubid-passport`; SDK work lives
  in `Cubid-Me/cubid-sdk`.
- Any SDK-impacting backend contract change needs a cross-repo comms note.
- Do not drop legacy custody/signing tables until hosted data is reviewed and a
  destructive cleanup todo explicitly authorizes it.

## Open Todos

### RW01. Adopt recoverable-wallet target state and supersede SIWC custody/signing

- Status: Started
- Timestamp started: 2026-05-20T18:46:01Z
- Timestamp completed: TBD
- Feature branch: codex/recoverable-wallet-direction-reset
- Head: bd9de8e
- Session-log reference(s): session: rw-v1

Create the canonical engineering doc for Cubid's new wallet role:
passkey-first, app-mediated, recoverable embedded wallets with Cubid as recovery
provider only. Mark the old SIWC key-generation/signing track as superseded in
repo roadmaps and docs. Confirm that normal signing, threshold/MPC provider
selection, transaction broadcasting, and wallet key generation belong to the
host app or specialized signing infrastructure, not Cubid Passport.

### RW02. Hard-disable Cubid-generated wallet creation and Cubid normal signing

- Status: Started
- Timestamp started: 2026-05-20T18:46:01Z
- Timestamp completed: TBD
- Feature branch: codex/recoverable-wallet-direction-reset
- Head: TBD
- Session-log reference(s): TBD

Disable `/api/v3/accounts/generate` and new
`/api/v3/signing/requests/create` flows with stable structured errors.
Preserve read/status routes only for historical visibility and support. Ensure
no active route decrypts `private.private_keys` for normal signing. Update
tests to prove new generation/signing attempts fail closed and existing
visibility remains redacted.

### RW03. Add recovery-bundle storage schema

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Add service-role-only storage for app-scoped recovery bundle references and
encrypted recovery payloads. The schema should support dapp id, dapp user UUID,
Cubid user binding, provider name, bundle version, status, recovery reference,
encrypted bundle material, expiry/rotation metadata, revoked/stale markers, and
audit fields. Use the existing private schema and Supabase Vault
envelope-encryption pattern.

### RW04. Add API v3 recovery-bundle enrollment and status routes

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Add dapp-authenticated API v3 routes for creating/updating a recovery bundle
reference and checking recovery status without exposing bundle contents.
Backend credentials alone must not be able to retrieve recovery material.
Responses should expose only safe metadata: bundle id, status, version,
timestamps, recovery eligibility, cooldown state, and audit references.

### RW05. Add user-authorized recovery release flow

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Add Passport-hosted recovery verification routes that release recovery material
only to the browser/client path after Cubid-side user verification. The flow
must bind recovery to the app context, dapp user, Cubid identity, request id,
expiry, and one-time recovery session. The SmarTrust backend must never receive
recovery material through backend credentials alone.

### RW06. Add recovery rotation and revocation

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Support stale bundle invalidation after recovery, passkey re-enrollment, or
app-side rotation. Add routes and Admin/Passport visibility for revoked,
rotated, expired, and active recovery bundles. Add audit events for create,
release, rotate, revoke, failed release, wrong user, expired session, and
cooldown denial.

### RW07. Define browser-safe recovery error taxonomy

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Standardize public error codes for recovery flows: cancelled, expired, wrong
user, unavailable credential, unsupported app context, cooldown active,
provider outage, bundle revoked, bundle not found, and verification required.
Coordinate these codes with `Cubid-Me/cubid-sdk` through cross-repo comms.

### RW08. Coordinate SDK package direction

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Write a handoff note to `Cubid-Me/cubid-sdk` describing the new package family
and boundaries from the spec. SDK work belongs there, not in this repo. The
handoff should ask SDK agents to remove or deprecate old Cubid-generated-wallet
helpers and build toward provider-abstract recoverable wallet packages.

### RW09. Reply to SmarTrust recovery-only handoff

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Update the SmarTrust sibling note with Cubid's committed direction, planned API
names, what is blocked, and what SmarTrust should build itself. Reference
SmarTrust `AW-01`, `AW-09`, and `AW-12`. Leave the SmarTrust repo sibling note
dirty so its agents see it.

### RW10. Hosted migration and smoke readiness

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

After RW03-RW06 land, run protected migration delivery and hosted smoke checks
for recovery enrollment, status lookup, user-authorized recovery release,
revocation, and fail-closed backend-only recovery reads. Record evidence in
repo status/docs before calling the recovery API ready.

