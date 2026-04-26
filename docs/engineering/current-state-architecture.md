# Cubid Current-State Architecture

Last updated: 2026-04-20

## Purpose

This document describes the current implementation architecture of the `cubid-passport` repository as it exists today. It is based on the checked-in code, not an aspirational target design.

## System Summary

The monorepo currently contains two application workspaces:

- Cubid Passport, a hybrid Next.js 14 application that lets end users:

  - authenticate with email, phone, and several social or identity providers
  - collect "stamps" that represent identity proofs and connected accounts
  - share selected stamps with third-party dapps through allow-list flows
  - create or link blockchain accounts across EVM, Solana, and NEAR
  - mint a Gitcoin Passport score onto NEAR as an SBT

- Cubid Admin, a preserve-first imported Next.js 13 canary application that lets operators:

  - authenticate with Firebase-issued bearer tokens
  - manage dapp configuration and page records
  - rotate app API keys
  - manage webhook records
  - use server-side Supabase access for admin workflows

The repository combines:

- App Router pages under `apps/passport/app/`
- legacy API routes under `apps/passport/pages/api/`
- a client-heavy React shell with many global providers
- direct Supabase database access from both browser code and server handlers
- blockchain and identity-provider integrations embedded across UI components and API endpoints
- a monorepo root shell that now hosts two active application workspaces and the first shared packages

## High-Level Topology

```mermaid
flowchart LR
    User["User Browser"] --> NextUI["Next.js App Router UI"]
    NextUI --> Hooks["Client Hooks and Helpers"]
    NextUI --> Api["pages/api Handlers"]
    Hooks --> Supabase["Supabase DB and Auth"]
    Api --> Supabase
    NextUI --> Firebase["Firebase Auth"]
    NextUI --> OwnID["OwnID"]
    NextUI --> Wagmi["Wagmi / Web3Modal"]
    NextUI --> Solana["Solana Wallet Adapter"]
    NextUI --> NearSelector["NEAR Wallet Selector"]
    NextUI --> Lens["Lens / Farcaster SDKs"]
    Api --> Worldcoin["Worldcoin OAuth APIs"]
    Api --> Gitcoin["Gitcoin Passport APIs"]
    Api --> NEAR["NEAR RPC / issuer.cubidme.near"]
    Api --> Twilio["Twilio"]
    Api --> Webhooks["Cubid webhook endpoints"]
```

## Repository Layout

### Frontend

- `apps/passport/app/`
  UI routes for landing, login, authenticated app, allow flow, widget flow, Worldcoin callback, Telegram flow, and PII flow.
- `apps/admin/app/`
  Admin UI routes and client-side shell for the control-plane experience.
- `apps/passport/components/`
  Shared UI plus large feature components for stamps, profile, minting, auth wrappers, and wallet integrations.
- `apps/admin/components/`
  Admin-presentational components, links, and layout helpers.
- `apps/passport/hooks/`
  Browser hooks for auth, stamp loading, and app-id resolution.
- `apps/admin/hooks/`
  Admin-specific React hooks and UI helpers.
- `apps/passport/redux/`
  Minimal Redux store for authenticated user state.
- `apps/admin/redux/`
  Admin Redux store and associated slices.
- `apps/passport/config/`
  Site config plus Wagmi connector config.
- `apps/admin/constant/`
  Admin site config and environment-flags module.
- `apps/passport/styles/`
  Global Tailwind styles.

### Backend and Shared Logic

- `apps/passport/pages/api/`
  All server endpoints. This includes generic Supabase CRUD handlers, dapp APIs, wallet flows, verification flows, webhooks, and third-party callbacks.
- `apps/admin/pages/api/admin/`
  Authenticated admin API routes for app config, page config, webhook management, metadata, and auth synchronization.
- `apps/passport/lib/`
  Shared browser/server helpers for Supabase, Firebase, stamp insertion, NEAR wallet handling, hashing, and outbound webhook triggers.
- `apps/admin/lib/server/`
  Server-only helpers for Supabase access, Firebase Admin bearer-token verification, and admin API authorization helpers.
- `packages/config/`
  Shared env-loading helpers currently used by Admin server code.
- `packages/types/`
  Shared cross-workspace type contracts, currently used for site and navigation metadata.

## Runtime Architecture

## Monorepo Shell

The repo root now acts as a true monorepo shell rather than an application root.

Current traits:

- `pnpm-workspace.yaml` defines `apps/*`, `services/*`, `packages/*`, and `tooling/*` workspaces.
- `turbo.json` defines the shared task graph.
- Root `pnpm build`, `pnpm lint`, `pnpm typecheck`, and `pnpm test` now validate all workspaces that expose those tasks.
- Root `pnpm dev` still defaults to Passport, while `pnpm dev:admin` starts the Admin workspace explicitly.

## Frontend Shell

The Passport application shell is defined in [app/layout.tsx](/Users/botmaster/src/cubid/cubid-passport/apps/passport/app/layout.tsx) inside the `apps/passport` workspace.

Current traits:

- The layout is a client component.
- It initializes a large set of providers globally:
  - `SessionProvider` for NextAuth
  - `SolanaAppWalletProvider`
  - `WagmiProvider`
  - `QueryClientProvider`
  - `LensProvider`
  - `AuthKitProvider` for Farcaster
  - `OwnIDInit`
  - Redux `Provider`
  - theme and toast providers
- It eagerly starts the custom NEAR wallet helper from `lib/nearWallet.ts`.
- It contains `window` and `localStorage` dependent routing logic in the layout itself.

Practical consequence:

- The application is effectively client-first, even though it runs inside Next.js.
- Build-time warnings already show browser-only assumptions leaking into prerendered code paths.

## Route Model

### App Router Pages

Key routes under `apps/passport/app/`:

- `/`
  Landing page and Fractal callback handling.
- `/login`
  Email and phone authentication flow.
- `/app`
  Main authenticated experience with tabs for profile, stamps, about, and NEAR SBT minting.
- `/allow`
  Dapp-facing consent flow for sharing required and optional stamps.
- `/widget-allow`
  Social-provider callback helper for embedded allow flows.
- `/worldcoin`
  Worldcoin OAuth callback page.
- `/pii`
  PII-related workflow.
- `/telegram`, `/telegram-connect`
  Telegram-related user flows.

### Legacy API Routes

All server endpoints remain under `apps/passport/pages/api/`. The codebase has not been migrated to App Router route handlers.

## Authentication and Session Model

Authentication is split across several systems instead of one unified auth boundary.

### Primary User Login

The main login experience in [app/login/page.tsx](/Users/botmaster/src/cubid/cubid-passport/apps/passport/app/login/page.tsx) uses:

- OwnID plus Firebase custom tokens for email login
- Firebase phone auth for SMS OTP login
- Passkey sign-in for OIDC `login_challenge` flows, with Passport hosting the browser WebAuthn ceremony and proxying challenge completion to `services/oidc`

After login:

- `hooks/useAuth.ts` listens to Firebase auth state
- basic user fields are copied into Redux
- `email`, `phone`, and guest/allow state are also mirrored into `localStorage`
- the hook looks up the matching `users` row through `/api/supabase/select`
- OIDC issuer session IDs created during Login with Cubid are stored in an HTTP-only Passport cookie for passkey registration instead of `localStorage`

### Social / Provider Auth

Additional provider logins happen outside the primary login flow:

- Supabase OAuth is used for social stamps such as GitHub, Google, Twitter, Discord, and similar providers
- Farcaster auth is handled through `@farcaster/auth-kit`
- Worldcoin uses a separate OAuth flow through NextAuth config and a dedicated callback page

### Guest vs Authenticated Guards

- [components/auth/guest.tsx](/Users/botmaster/src/cubid/cubid-passport/apps/passport/components/auth/guest.tsx) redirects signed-in users to `/app`
- [components/auth/authenticated.tsx](/Users/botmaster/src/cubid/cubid-passport/apps/passport/components/auth/authenticated.tsx) redirects guests to `/login` unless the allow-flow token path is active

### NextAuth Usage

NextAuth is present but narrowly used:

- [pages/api/auth/[...nextauth].ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/pages/api/auth/%5B...nextauth%5D.ts) defines a Worldcoin OAuth provider
- [middleware.ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/middleware.ts) protects `/admin` and `/me`

In practice, Firebase plus local state appears to drive the core app experience more than NextAuth.

## Admin Authentication and Data Model

Admin has a distinct trust boundary from Passport.

### Admin access model

- Browser clients authenticate with Firebase and present bearer tokens to `apps/admin/pages/api/admin/*`.
- `apps/admin/lib/server/firebaseAdmin.ts` verifies those tokens server-side.
- `apps/admin/lib/server/adminApi.ts` loads the matching `dapp-admin-users` row and enforces that the caller is an authorized admin user before privileged reads or writes continue.

### Admin data access

- `apps/admin/lib/server/supabase.ts` uses a server-side Supabase service role.
- Admin routes operate on dapp configuration, page records, webhook records, and metadata rather than Passport’s stamp-consent flows.
- The Admin workspace currently preserves its original app structure, but its runtime now participates in the same monorepo install and validation graph as Passport.

## State Management

State is distributed across several mechanisms:

- Redux stores the current authenticated user object only.
- React local state holds most feature state.
- React Query is initialized globally but is not the primary data-fetching abstraction.
- `localStorage` is used heavily for flow state:
  - `allow-uuid`
  - `allow_url`
  - `page_id`
  - `socialName`
  - `email`
  - `phone`
  - `unauthenticated_user`

This means navigation and permissions are partly application state and partly browser storage state.

## Data Access Model

Supabase is the central system of record.

### Current Access Patterns

There are two active patterns:

1. Direct client-side Supabase usage
   - Social login in `components/stamps/index.tsx`
   - Widget allow flow in `app/widget-allow/page.tsx`
   - Shared client import from [lib/supabase.ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/lib/supabase.ts)

2. Generic API wrappers over Supabase
   - [pages/api/supabase/select.ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/pages/api/supabase/select.ts)
   - [pages/api/supabase/insert.ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/pages/api/supabase/insert.ts)
   - [pages/api/supabase/update.ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/pages/api/supabase/update.ts)
   - [pages/api/supabase/delete.ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/pages/api/supabase/delete.ts)

The generic CRUD endpoints accept arbitrary table names and filters from the caller. That is a major architectural characteristic of the current system.

### Inferred Core Data Model

Based on code references, important tables include:

- `users`
- `stamps`
- `stamptypes`
- `dapps`
- `dapp_users`
- `stamp_dappuser_permissions`
- `dapp_pages`
- `dapp_stamptypes`
- `stampscore_dapps`
- `stampscores_available`
- `wallet_details`
- `brightid-data`
- `near-api-accounts`
- `evm_accounts`
- `cronjobs`
- `all_blacklisted_stamps`

## Stamp Architecture

The stamp system is the core domain concept.

### Stamp Definition

Stamp type IDs are duplicated in multiple places, especially:

- [lib/stampInsertion.ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/lib/stampInsertion.ts)
- [pages/api/utils/stampKey.ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/pages/api/utils/stampKey.ts)
- feature components that keep local copies

### Stamp Write Path

The main write helper is `insertStamp` in [lib/stampInsertion.ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/lib/stampInsertion.ts).

What it currently does:

- resolves the stamp type
- optionally creates derived child stamps such as email or phone
- inserts the primary stamp row
- creates `stamp_dappuser_permissions`
- creates a `dapp_users` row if needed
- triggers Cubid webhook notifications

There is also a `server_insertStamp` path for API handlers to insert stamps directly from the server side.

### Permission Model

Sharing with dapps is permissioned through `stamp_dappuser_permissions`.

- allow flows load dapp-specific permission rows
- users can selectively grant stamp access during `/allow`
- the hook in [lib/insert_stamp_perm.ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/lib/insert_stamp_perm.ts) bridges stamp creation and permission insertion

## Main User Flows

## 1. Core Cubid Login and App Usage

```mermaid
sequenceDiagram
    participant U as User
    participant Login as /login
    participant FB as Firebase / OwnID
    participant API as /api/supabase/*
    participant DB as Supabase
    participant App as /app

    U->>Login: authenticate by email or phone
    Login->>FB: sign in
    Login->>API: upsert user row if missing
    API->>DB: read/write users
    Login->>API: insert auth stamp
    API->>DB: write stamps and permissions
    U->>App: open authenticated app
```

The authenticated app at `/app` is a tabbed container around:

- `Profile`
- `Stamps`
- `About`
- `MintHumanity`

## 2. Stamp Collection

The stamp collection UI in [components/stamps/index.tsx](/Users/botmaster/src/cubid/cubid-passport/apps/passport/components/stamps/index.tsx) acts as a large orchestration layer for:

- Supabase OAuth social providers
- Gitcoin Passport
- EVM wallet connection through Wagmi/Web3Modal
- Solana wallet connection
- NEAR wallet selector
- BrightID
- GoodDollar
- Instagram
- Phone
- Farcaster
- Lens

This component directly coordinates UI state, provider SDKs, Supabase lookups, and stamp writes.

## 3. Dapp Allow Flow

The allow flow is centered on:

- [app/allow/page.tsx](/Users/botmaster/src/cubid/cubid-passport/apps/passport/app/allow/page.tsx)
- [pages/api/allow/fetch_allow_uid.ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/pages/api/allow/fetch_allow_uid.ts)

Current behavior:

- consumes `uid`, `page_id`, and `colormode` query params
- loads the requesting dapp user, page metadata, requested stamp types, and score metadata
- shows required and optional stamp sharing sections
- writes permission rows when a user approves a stamp
- redirects back to the dapp page redirect URL on submit

The embedded social widget path in [app/widget-allow/page.tsx](/Users/botmaster/src/cubid/cubid-passport/apps/passport/app/widget-allow/page.tsx) performs a provider login, inserts the resulting stamp, then redirects back to the requesting dapp page.

## 4. Wallet and On-Chain Identity Flows

### EVM

- Wagmi and Web3Modal handle user wallet connections.
- Gitcoin Passport data is fetched through `/api/gitcoin-passport-data`.
- `/api/get_app_scoped_EVM_public_key` can also generate and persist an app-scoped EVM wallet for a user.

### Solana

- `components/walletProvider.tsx` wires in the Solana wallet adapter.
- A connected public key is inserted as a Solana stamp.

### NEAR

- [lib/nearWallet.ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/lib/nearWallet.ts) wraps NEAR wallet selector.
- `/api/createnewnearacc` creates new NEAR accounts under `issuer.cubidme.near`.
- `/api/mint-sbt` mints an SBT representing a Gitcoin Passport score onto NEAR.
- `components/minthumanity/nearFlow.tsx` is the main UI for this journey.

## API Surface by Area

The API layer is broad and mostly organized by feature folder.

### Generic Data Access

- `/api/supabase/*`

### Allow and Dapp Access

- `/api/allow/*`
- `/api/dapp/*`
- `/api/v2/create_user`
- `/api/v2/identity/*`
- `/api/v2/score/*`

### Verification and Credential Collection

- `/api/verify/*`
- `/api/worldcoin/*`
- `/api/twillio/*`
- `/api/v2/twillio/*`
- `/api/v2/email/*`
- `/api/telegram/*`
- `/api/insta-data-fetch`
- `/api/fractal`

### Wallet and Blockchain

- `/api/get_app_scoped_EVM_public_key`
- `/api/createnewnearacc`
- `/api/mint-sbt`
- `/api/gitcoin-near-cron-job`
- `/api/gitcoin-passport-data`
- `/api/wallet/*`

### Webhooks and Background Behavior

- `/api/cubid-webhook/*`
- `/api/five_min_3oc_cron`

## External Integrations

The current codebase integrates with:

- Supabase
- Firebase Auth
- OwnID
- Worldcoin
- Gitcoin Passport
- NEAR RPC and NEAR wallet selector
- EVM chains through Wagmi, WalletConnect, and Web3Modal
- Solana wallet adapter
- Lens
- Farcaster Auth Kit
- Twilio
- Instagram OAuth endpoints
- Fractal OAuth endpoints

## Current Architectural Characteristics

These are not opinions about an ideal future design. They are the notable traits of the code as written today.

- The app is frontend-heavy and browser-state-heavy.
- Business logic is spread across client components, hooks, shared `lib/` helpers, and API handlers.
- There is no strong separation between presentation, orchestration, and domain logic.
- Supabase acts as the primary backend, identity store, and permissions store.
- The API layer mixes public integration endpoints, internal helper endpoints, and generic database access in the same namespace.
- App Router pages are modernized, but the backend remains fully legacy `pages/api` inside `apps/passport`.

## Current Risks and Technical Debt

These are visible implementation risks that affect the current architecture.

- The root layout depends on `window` and `localStorage`, which already causes build-time browser-only warnings.
- Supabase service-role style access is imported directly into browser code through [lib/supabase.ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/lib/supabase.ts).
- Generic Supabase CRUD endpoints allow arbitrary table access patterns from callers.
- Authentication is fragmented across Firebase, Supabase OAuth, OwnID, Farcaster, and limited NextAuth usage.
- Stamp type mappings are duplicated across the codebase.
- Large feature components such as [components/stamps/index.tsx](/Users/botmaster/src/cubid/cubid-passport/apps/passport/components/stamps/index.tsx) combine UI, data loading, third-party SDK orchestration, and persistence writes.
- There are still hardcoded integration credentials and project IDs in the repo.
- Build output already shows `localStorage is not defined` warnings and a Celo dependency warning around `fs` resolution.

## Suggested Reading Order

For engineers getting oriented, this is the fastest path through the codebase:

1. [app/layout.tsx](/Users/botmaster/src/cubid/cubid-passport/apps/passport/app/layout.tsx)
2. [hooks/useAuth.ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/hooks/useAuth.ts)
3. [components/stamps/index.tsx](/Users/botmaster/src/cubid/cubid-passport/apps/passport/components/stamps/index.tsx)
4. [lib/stampInsertion.ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/lib/stampInsertion.ts)
5. [app/allow/page.tsx](/Users/botmaster/src/cubid/cubid-passport/apps/passport/app/allow/page.tsx)
6. [pages/api/allow/fetch_allow_uid.ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/pages/api/allow/fetch_allow_uid.ts)
7. [components/minthumanity/nearFlow.tsx](/Users/botmaster/src/cubid/cubid-passport/apps/passport/components/minthumanity/nearFlow.tsx)
8. [pages/api/mint-sbt.ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/pages/api/mint-sbt.ts)

## Bottom Line

Today, Cubid Passport is best understood as a client-centric identity orchestration app backed by Supabase, with a large integration layer for social proofs and blockchain account flows. The most important architectural seams are:

- stamp creation and permissioning
- dapp allow-list sharing
- hybrid auth across Firebase, Supabase OAuth, and provider SDKs
- NEAR/EVM/Solana account and proof flows

Those seams should stay central in any future refactor, because they are where the current product behavior is concentrated.
