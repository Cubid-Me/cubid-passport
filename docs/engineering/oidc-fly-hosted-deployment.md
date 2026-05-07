# OIDC Fly Hosted Deployment

Status: staging adapter/runbook for `services/oidc`

This runbook deploys the standalone OIDC issuer service to Fly.io for the staging issuer `https://staging-id.cubid.me`. It is intentionally separate from the Passport/Admin Vercel deployments because `services/oidc` is a long-running Node HTTP service, not a Next.js app.

## Deployment Shape

- Fly app: `cubid-oidc-staging`
- Region: `yyz`
- Service port: `OIDC_PORT=8080`
- Public issuer: `https://staging-id.cubid.me`
- Passkey RP ID: `cubid.me`, so staging can support both `passport.cubid.me` and `passport-preview.cubid.me` browser origins.
- Fly config: `services/oidc/fly.staging.toml`
- Container build: `services/oidc/Dockerfile`
- Runtime command: `pnpm --filter @cubid/oidc start`

Use the repository root as the Fly deploy context so workspace packages such as `@cubid/auth`, `@cubid/config`, `@cubid/claims`, and `@cubid/identity` are available during install and runtime.

```sh
fly deploy . -c services/oidc/fly.staging.toml --dockerfile services/oidc/Dockerfile
```

## Required Fly Secrets

Set these as Fly app secrets, not tracked files:

- `OIDC_PAIRWISE_SUBJECT_MASTER_SECRET`: at least 32 random characters. Staging and production must use different values.
- `OIDC_ACTIVE_SIGNING_KID`: active JWK `kid`.
- `OIDC_SIGNING_PRIVATE_JWK_JSON`: RSA private JWK for RS256 token signing. The JWK should include the same `kid`.
- `SUPABASE_URL`: hosted Supabase project URL for the staging/dev environment.
- `SUPABASE_SERVICE_ROLE_KEY`: hosted Supabase service-role key for OIDC persistence.
- `OIDC_FIREBASE_PROJECT_ID`: Firebase project id accepted for hosted Passport login completion.

Optional TCOIN seed secrets can be set only if the issuer service itself will run the seed script in the deployed environment:

- `TCOIN_OIDC_REDIRECT_URIS`
- `TCOIN_OIDC_POST_LOGOUT_REDIRECT_URIS`
- `TCOIN_OIDC_CONTACTS`
- `TCOIN_OIDC_POLICY_URI`
- `TCOIN_OIDC_TOS_URI`
- `TCOIN_OIDC_LOGO_URI`

## DNS And Certificate

Add the hostname to Fly:

```sh
fly certs add staging-id.cubid.me --app cubid-oidc-staging
fly certs show staging-id.cubid.me --app cubid-oidc-staging
```

Then create the DNS record requested by Fly, normally a `CNAME` from `staging-id.cubid.me` to the Fly app hostname. DNS must point at Fly before the certificate can become ready.

`id.cubid.me` should remain reserved for the production issuer and should use a separate Fly app, secrets, signing key, pairwise subject secret, and ideally a separate Supabase production project.

## Staging Smoke Checks

Run these after deployment and DNS/certificate readiness:

```sh
curl -fsS https://staging-id.cubid.me/.well-known/openid-configuration
curl -fsS https://staging-id.cubid.me/jwks
curl -i -X POST https://staging-id.cubid.me/token
curl -i -X POST https://staging-id.cubid.me/userinfo
```

Expected results:

- Discovery returns `issuer: "https://staging-id.cubid.me"` and endpoint URLs under the staging issuer.
- JWKS returns the active public key with the configured `kid`.
- Empty `/token` and `/userinfo` requests fail with OIDC-shaped errors and include `X-Request-Id`.
- The Fly app logs do not print secret values.

Full relying-party validation still requires a registered OIDC client and an Authorization Code + PKCE login through Passport.

## TCOIN Client Seed

After hosted migrations and OIDC secrets are ready, seed TCOIN from a trusted operator shell with the staging Supabase service-role credentials and exact redirect URIs:

```sh
pnpm --filter @cubid/oidc seed:tcoin
```

Do not seed placeholder redirect URIs. The TCOIN client should start as a `public_web` client requesting only `openid email profile`.

## Rollback

If deployment fails before traffic is switched, leave DNS unchanged or remove the Fly certificate. If a bad version reaches the hostname, roll back to the previous Fly release:

```sh
fly releases --app cubid-oidc-staging
fly releases rollback <version> --app cubid-oidc-staging
```

If signing key material is suspected to have leaked, rotate `OIDC_SIGNING_PRIVATE_JWK_JSON` and `OIDC_ACTIVE_SIGNING_KID`, wait for issued tokens to expire, and then retire the old key. If the pairwise subject secret leaks, treat it as a higher-severity identity-correlation incident because stable pairwise subjects depend on it.
