# SDK Package Target State

This document defines the target public SDK ecosystem for Cubid. It complements
the agent backgrounder by translating the product principles into package
boundaries, dependency rules, and publishing ownership.

## Package Ecosystem

Official packages are published under the npm org `@cubid/*`, owned by the
`cubid` npm organization and maintained by the `developers` team. Publishing
uses trusted publishing from GitHub Actions; do not publish official packages
from personal npm accounts or long-lived local tokens.

Target packages:

- `@cubid/core`: required runtime-agnostic foundation
- `@cubid/react`: React hooks and components
- `@cubid/evm`: EVM wallet and signing logic, using `viem`
- `@cubid/wagmi`: wagmi-specific React/EVM integration
- `@cubid/solana`: Solana wallet and signing logic
- `@cubid/cardano`: Cardano wallet and signing logic
- `@cubid/sui`: Sui wallet and signing logic
- `@cubid/near`: NEAR wallet and signing logic
- `@cubid/comms`: optional later communications helpers
- `@cubid/secrets`: optional later encryption and custody helpers

## Package Responsibilities

`@cubid/core` is the foundation. It owns API client wrappers, user creation,
identity and stamps, humanity score, location, basic secret API wrappers, shared
types, and structured errors. It must stay runtime-agnostic: no React, Next.js,
Node-only APIs, browser-only assumptions, wagmi, chain SDKs, or heavy
dependencies.

`@cubid/react` may depend on `@cubid/core`. It owns React hooks, React
components, AllowPage integration helpers, and auth/session UI helpers. It must
not become the home for protocol logic that belongs in core.

Chain packages own chain-specific wallet, key, and signing behavior. Each chain
package should avoid cross-chain assumptions. `@cubid/evm` may depend on
`viem`; `@cubid/wagmi` is the only package that may depend on `wagmi`.

`@cubid/secrets`, if introduced, owns advanced encryption/custody helpers. Until
then, `@cubid/core` may expose typed API wrappers for basic secret operations
but should not accumulate heavy crypto custody dependencies.

## Placement Rules For Agents

- Default to `@cubid/core` for small runtime-agnostic API, type, and error
  helpers.
- Use `@cubid/react` for React-specific hooks, components, providers, and UI
  flows.
- Use the relevant chain package when a feature requires chain-specific key,
  wallet, signing, transaction, or SDK dependencies.
- Put wagmi integrations only in `@cubid/wagmi`.
- Create or expand a specialized package when adding a heavy dependency would
  pollute core or force unrelated consumers to install ecosystem-specific code.
- Avoid duplicate protocol logic across packages; shared protocol contracts
  should live in core unless a stronger boundary is documented.

## Current E02 Direction

E02 starts by publishing `@cubid/core` as the dual-target npm/JSR foundation.
High-level identity sync helpers, React profile-completion primitives, chain SDK
packages, Deno/Supabase Edge examples, and API stability notes build on that
foundation in later E02 slices.
