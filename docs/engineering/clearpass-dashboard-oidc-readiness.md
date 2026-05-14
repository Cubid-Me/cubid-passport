# ClearPass Dashboard OIDC Readiness

Last updated: 2026-05-14
Status: B02.6 repo-side seed and smoke contract

## Purpose

ClearPass Dashboard uses Login with Cubid as a browser-safe developer
authentication boundary. The dashboard is a Vite/React app, so it must use a
public OIDC client with Authorization Code + PKCE. Browser code must never carry
Cubid dapp API keys, OIDC signing material, Supabase service-role keys, Passport
internal tokens, or any other privileged credential.

The public SDK work is complete in `Cubid-Me/cubid-sdk`: `@cubid/auth` owns the
runtime-agnostic OIDC/PKCE helpers and `@cubid/auth-react` owns the React
session bindings. This repo owns the relying-party client registration,
Passport/OIDC runtime behavior, and hosted smoke evidence.

## Client Contract

ClearPass Dashboard should be registered as:

- client id: `clearpass-dashboard`
- client type: `public_web`
- grant type: `authorization_code`
- token endpoint auth method: `none`
- PKCE: required, `S256`
- default and allowed scopes: `openid email profile`
- staging issuer: `https://staging-id.cubid.me`
- production issuer: `https://id.cubid.me`

Initial redirect and logout URIs:

- local callback: `http://localhost:5173/auth/callback`
- local post-logout redirect: `http://localhost:5173/`
- production callback: `https://dashboard.clearpass.app/auth/callback`
- production post-logout redirect: `https://dashboard.clearpass.app/`

If ClearPass adds a separate staging dashboard origin, add its exact callback
and post-logout redirect URI before seeding that environment. Do not seed
placeholder domains.

## Seed Command

Set environment variables for the target Supabase/OIDC environment and run:

```sh
pnpm --filter @cubid/oidc seed:clearpass-dashboard
```

For a safe validation that does not write to Supabase:

```sh
pnpm --filter @cubid/oidc seed:clearpass-dashboard -- --dry-run
```

Required seed variables:

- `CLEARPASS_DASHBOARD_OIDC_CLIENT_ID`, normally `clearpass-dashboard`
- `CLEARPASS_DASHBOARD_OIDC_CLIENT_NAME`, normally `ClearPass Dashboard`
- `CLEARPASS_DASHBOARD_OIDC_REDIRECT_URIS`
- `CLEARPASS_DASHBOARD_OIDC_POST_LOGOUT_REDIRECT_URIS`

Optional metadata variables:

- `CLEARPASS_DASHBOARD_OIDC_CONTACTS`
- `CLEARPASS_DASHBOARD_OIDC_POLICY_URI`
- `CLEARPASS_DASHBOARD_OIDC_TOS_URI`
- `CLEARPASS_DASHBOARD_OIDC_LOGO_URI`

The seed command creates or updates a stable public client. It stores no client
secret and prints only non-secret registration metadata.

## Hosted Smoke

After the client exists in the target Supabase project, run a full browser smoke
with ClearPass Dashboard using the SDK example contract:

1. Confirm discovery loads from the target issuer.
2. Launch the authorization URL from ClearPass Dashboard.
3. Complete hosted Passport login and consent.
4. Confirm the callback receives `code` and the original `state`.
5. Exchange the code with `client_id`, `redirect_uri`, and `code_verifier`.
6. Confirm `/userinfo` returns a pairwise `sub` and only consented
   `email`/`profile` claims.
7. Confirm logout redirects only to registered post-logout URIs.
8. Confirm the browser never contains privileged Cubid credentials.

Record the exact client id, issuer, redirect URI, SDK package versions, and
smoke result in the session log before closing B02.6.

## Current Boundary

B02.6 does not add SDK code. Any SDK-facing changes must be coordinated through
`Cubid-Me/cubid-sdk`. If hosted smoke reveals an SDK contract gap, write an
outbound note to that repo instead of modifying public SDK packages here.
