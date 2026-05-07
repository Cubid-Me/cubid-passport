# OIDC TCOIN Readiness

This document records the repo-side production readiness contract for using Login with Cubid from TCOIN. It does not claim that infrastructure has been deployed; live rollout still requires hosting, DNS, secrets, and Supabase migration application in the target environment.

The staging hosted deployment adapter and Fly.io operator runbook now live in [docs/engineering/oidc-fly-hosted-deployment.md](./oidc-fly-hosted-deployment.md).

## Issuer Environments

- Local issuer: `http://localhost:4280`
- Staging issuer: `https://staging-id.cubid.me`
- Production issuer target: `https://id.cubid.me`

Staging and production must use separate Supabase projects or at minimum separate OIDC signing keys, pairwise subject secrets, and client registrations. TCOIN should test against staging before any production identity state is used.

## Required Runtime Configuration

The OIDC service owns issuer runtime secrets. Do not place these values in Passport, Admin, or client-safe packages.

- `OIDC_ISSUER_URL`: stable issuer URL advertised in tokens and discovery.
- `OIDC_PUBLIC_ORIGIN`: externally reachable origin for endpoint URLs.
- `OIDC_PAIRWISE_SUBJECT_MASTER_SECRET`: long random secret used for pairwise subject derivation.
- `OIDC_ACTIVE_SIGNING_KID`: active signing key id.
- `OIDC_SIGNING_PRIVATE_JWK_JSON`: active private JWK used for RS256 token signing.
- `PASSPORT_LOGIN_URL`: hosted Passport login challenge URL.
- `PASSPORT_CONSENT_URL`: hosted Passport consent challenge URL.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: OIDC service persistence credentials.

`OIDC_JWKS_JSON` is a deprecated fallback for discovery-only local development. Real token issuance requires `OIDC_SIGNING_PRIVATE_JWK_JSON`.

## TCOIN Client Registration

TCOIN is a `public_web` OIDC client for the first integration slice. It should use:

- grant types: `authorization_code`
- token endpoint auth method: `none`
- scopes: `openid email profile`
- redirect URIs: exact local, preview, staging, and production callback URLs
- post-logout redirect URIs: exact local, preview, staging, and production landing URLs

Use the idempotent seed command from the monorepo root after setting the TCOIN env variables:

```sh
pnpm --filter @cubid/oidc seed:tcoin
```

The seed command creates the client if missing, or updates redirect URIs, scopes, grant types, auth method, status, and metadata when a client with the configured name already exists.

## Database Readiness

Apply all Supabase migrations through the latest OIDC token-control migration before testing TCOIN:

- OIDC clients, signing keys, human subjects, sessions, auth codes, refresh tokens, device codes, consents, and audit logs.
- Authorization request tracking.
- Claim registry and identity-depth policy foundations.
- WebAuthn/passkey foundations.
- Access-token records and rate-limit buckets.

## Key Rotation

The first implementation signs ID tokens and access tokens with an env-backed private JWK. Rotation should follow this operational sequence:

1. Generate a new RSA signing JWK and unique `kid`.
2. Deploy it as `OIDC_SIGNING_PRIVATE_JWK_JSON` with `OIDC_ACTIVE_SIGNING_KID`.
3. Keep the previous public key available in `/jwks` for at least the maximum token lifetime plus clock skew.
4. Retire the old private key only after all tokens signed by the old `kid` have expired.

The current repo implementation exposes the active public key through `/jwks`. Multi-key JWKS grace publishing should be added before reducing token lifetimes or increasing relying-party count.

## Health and Smoke Tests

Before TCOIN treats Cubid as a usable issuer:

- `GET /.well-known/openid-configuration` returns the staging or production issuer URL and only implemented grant types.
- `GET /jwks` returns the active public key with the configured `kid`.
- A local Authorization Code + PKCE flow completes through `/authorize`, Passport login challenge, Passport consent challenge, `/token`, and `/userinfo`.
- `/token` returns signed `id_token` and `access_token`.
- `/userinfo` returns a pairwise `sub` and only consented `email`/`profile` claims.
- `/revoke` prevents subsequent `/userinfo` use for the revoked access token.
- `/logout` accepts only exact registered post-logout redirect URIs.
- Passport Profile shows the user's Login with Cubid client consents and can revoke a consent without exposing human subject keys, Cubid user IDs, token hashes, or session IDs to the browser.
- Admin OIDC Ops shows client status, redirect URI visibility, scope visibility, rate-limit tier, claim policy bindings, recent audit events, active consent/token counts, and token/userinfo success/failure counters.
- Admin OIDC Ops can suspend/reactivate a client and update its rate-limit tier; redirect URI, scope, secret, and metadata editing remain separate Admin workflows.

## Explicit Non-Deployment

B02.4 is repo-side readiness only. It does not perform:

- DNS creation for `id.cubid.me`.
- Production hosting provider deployment.
- Production secret provisioning.
- Supabase migration execution against staging or production.
- TCOIN application-side OIDC configuration.
