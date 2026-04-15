# Cubid Passport

Cubid Passport is a Next.js app for passwordless identity onboarding, Gitcoin Passport stamp collection, and minting a Gitcoin Passport score onto NEAR as a soulbound token.

The original hackathon walkthrough is here:
[YouTube demo](https://www.youtube.com/watch?v=Um1-IB7lmNg)

## Stack

- Next.js 14 with the App Router and legacy `pages/api` routes
- TypeScript, Tailwind CSS, Redux Toolkit, and NextAuth
- Supabase-backed API flows
- NEAR, Gitcoin Passport, Worldcoin, Twilio, and other identity integrations

## Local Setup

This repository is standardized on `npm`.
Use Node 20 for the least surprising install and build behavior.

```bash
npm ci --legacy-peer-deps
npm run dev
```

The main verification commands are:

```bash
npm run lint
npm run typecheck
npm run build
```

## Environment Notes

The app expects several credentials at runtime, including values such as:

- `NEXT_PUBLIC_DAPP_ID`
- `private_key_near`
- `WLD_CLIENT_ID`
- `WLD_CLIENT_SECRET`
- `twilio_sid`
- `authToken`
- `is_allow_token`

Some third-party credentials are still hardcoded in source files and should be moved into environment variables before this app is treated as production-ready.

## Repository Layout

- `app/`: App Router pages and UI flows
- `components/`: reusable UI, auth, and web3 components
- `pages/api/`: API routes and integration endpoints
- `lib/`: shared helpers for Supabase, NEAR, Firebase, and stamping
- `redux/`: Redux store and slices
- `config/`, `hooks/`, `styles/`, `types/`: supporting app modules

## Cleanup Notes

- Removed tracked Finder metadata and TypeScript build cache output
- Removed duplicate lockfiles so the repo has a single package-manager source of truth
- Removed committed NEAR key files from the repo; rotate any exposed keys before further deployment
