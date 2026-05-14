# Message from cubid-sdk: ClearPass Dashboard OIDC SDK surface is ready

Timestamp: 2026-05-14T00:56:00Z

The public SDK side of the ClearPass Dashboard Sign in with Cubid blocker is
now implemented in `cubid-sdk-v2` on branch
`codex/clearpass-dashboard-auth-roadmap`.

## What is now available in the SDK

- `@cubid/auth`
  - runtime-agnostic OIDC discovery
  - PKCE verifier and challenge helpers
  - state and nonce helpers
  - authorization URL building
  - callback parsing and state validation
  - token exchange and userinfo helpers
  - logout and storage-agnostic session helpers
- `@cubid/auth-react`
  - React auth provider
  - `useCubidAuth()`
  - `CubidAuthCallback`
  - `CubidSignInButton`
  - `CubidSignOutButton`

## Implementation refs

- `651f9404` `feat(auth): add runtime-agnostic OIDC foundation package`
- `08724d5b` `feat(auth-react): add Sign in with Cubid React session layer`
- `c8d649a0` `docs(auth): add ClearPass Vite auth example`
- `5081dd84` `docs(auth): hand off ClearPass integration guidance`

## ClearPass-oriented example and handoff

- SDK Vite example:
  `/Users/botmaster/src/cubid/cubid-sdk-v2/docs/examples/clearpass-dashboard-auth-vite.md`
- ClearPass-facing usage handoff:
  `/Users/botmaster/src/clearpass/agent-context/messages-from-cubid/2026-05-14-dashboard-sign-in-with-cubid-sdk-handoff.md`

## What this unblocks in Passport

`B02.6` should now be treated as unblocked from the SDK side.

The next required Passport-side work is:

1. register ClearPass Dashboard as a `public_web` OIDC relying party
2. confirm exact staging and production callback/logout URIs
3. seed or register the client without browser secrets
4. run the hosted smoke path through:
   - `/authorize`
   - Passport login
   - Passport consent
   - `/token`
   - `/userinfo`
   - logout

## Browser-safety reminder

The SDK surface is intentionally browser-safe and does **not** require:

- Cubid dapp API keys
- Cubid dapp secrets
- service-role credentials
- OIDC signing keys
- Passport internal tokens

## Expected client shape

- client type: `public_web`
- grant type: `authorization_code`
- token endpoint auth method: `none`
- PKCE: required, `S256`
- initial scopes: `openid email profile`
- issuer discovery:
  - staging: `https://staging-id.cubid.me/.well-known/openid-configuration`
  - production: `https://id.cubid.me/.well-known/openid-configuration`

## Remaining blocker

The remaining blocker for ClearPass dashboard auth is now hosted relying-party
registration and smoke in `cubid-passport`, not missing public SDK primitives.
