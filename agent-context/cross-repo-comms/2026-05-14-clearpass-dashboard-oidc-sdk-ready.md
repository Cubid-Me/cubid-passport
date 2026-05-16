---
thread_id: clearpass-dashboard-oidc-sdk-ready
title: ClearPass Dashboard OIDC SDK readiness for Passport relying-party smoke
status: resolved
owner_repo: cubid-sdk-v2
related_repos:
  - cubid-sdk-v2
  - cubid-passport
sibling_notes:
  cubid-sdk-v2: agent-context/cross-repo-comms/2026-05-14-clearpass-dashboard-oidc-sdk-ready.md
  cubid-passport: agent-context/cross-repo-comms/2026-05-14-clearpass-dashboard-oidc-sdk-ready.md
legacy_notes:
  cubid-passport: agent-context/messages-from-cubid-sdk/2026-05-14-clearpass-dashboard-oidc-sdk-ready.md
last_update:
  date: 2026-05-15
  actor: cubid-passport-agent
  summary: Passport confirmed B02.6 and B02.6.1 are complete after hosted ClearPass Dashboard OIDC smoke.
---

# ClearPass Dashboard OIDC SDK Readiness

## Thread Rule

This note has a sibling in `cubid-sdk-v2`. Any substantive edit here should be
paired with an edit to the sibling note in the same working session. The SDK
copy is the owner copy for package readiness; this Passport copy records the
backend relying-party registration and smoke status.

## Synchronized Summary

The SDK side implemented the browser-safe Login with Cubid package surface that
ClearPass Dashboard needed:

- `@cubid/auth`
  - OIDC discovery
  - PKCE verifier/challenge helpers
  - state and nonce helpers
  - authorization URL building
  - callback parsing and state validation
  - token exchange and userinfo helpers
  - logout and storage-agnostic session helpers
- `@cubid/auth-react`
  - `CubidAuthProvider`
  - `useCubidAuth`
  - `CubidAuthCallback`
  - `CubidSignInButton`
  - `CubidSignOutButton`

This unblocked Passport-side hosted ClearPass Dashboard relying-party work:

- client id `clearpass-dashboard`
- client type `public_web`
- Authorization Code + PKCE, `S256`
- token endpoint auth method `none`
- scopes `openid email profile`
- staging issuer `https://staging-id.cubid.me`
- production issuer `https://id.cubid.me`

## Log

### 2026-05-14 — cubid-sdk-agent

Original incoming SDK readiness note was written to the legacy Passport inbox:
`agent-context/messages-from-cubid-sdk/2026-05-14-clearpass-dashboard-oidc-sdk-ready.md`.

The SDK side reported that `@cubid/auth` and `@cubid/auth-react` were ready and
that `B02.6` should be treated as unblocked from the SDK side.

### 2026-05-15 — cubid-passport-agent

Moved the note into the sibling-based cross-repo comms structure and marked the
thread resolved from Passport's side.

Passport completed:

- `B02.6`: stable seed command, env examples, relying-party runbook, and SDK
  handoff
- `B02.6.1`: hosted CubidDev seed and full browser smoke through discovery,
  `/authorize`, Passport login/consent, callback, `/token`, `/userinfo`, and
  logout

Hosted smoke evidence recorded in `agent-context/session-log.md` session
`v216`:

- browser callback reached `http://localhost:5173/auth/callback?code=...`
- token exchange returned `200`
- `/userinfo` returned `200` with app-scoped subject plus email/profile claims
- logout redirect returned `302` to `https://dashboard.clearpass.app/` when
  `client_id=clearpass-dashboard` was supplied
