# Repo Status

Last updated: 2026-05-07T11:29:22Z

| Requirement | Status |
| --- | --- |
| Branch workflow | Pass. `AGENTS.md` requires feature branches, PRs to `dev` by default, and session-log entries before commits. |
| README accuracy | Partial. README reflects the current platform state, but production readiness still depends on production deployment, secrets, and smoke checks. Staging OIDC and dev/preview Supabase delivery are now represented in the engineering docs. |
| License | Missing. No root `LICENSE` file is present; add one if this private repo needs an explicit license posture. |
| Session log | Pass. `agent-context/session-log.md` exists and is current through the latest hosted-readiness reconciliation work. |
| Roadmap metadata | Partial. Most todos are completed or ingested into `Cubid-Me/cubid-sdk`; `F01` is now complete for CubidDev, while `C04.1.1` remains intentionally not started until hosted smoke validates hashed dapp API keys. |
| Future ideas guardrail | Pass. `agent-context/future-ideas.md` exists and clearly states it is deferred reference material, not an active roadmap. |
| SDK boundary | Pass. `AGENTS.md` and README direct public SDK implementation to `Cubid-Me/cubid-sdk` and keep `packages/core` as a historical snapshot only. |
| Engineering docs | Pass. Current architecture and operating docs live under `docs/engineering/`; no target-state docs were found outside the expected docs area during this pass. |
| Testing strategy | Partial. Root scripts run lint, typecheck, test, build, and security checks; some chain placeholder packages still have no real tests. |
| Local acceptance harness | Partial. Unit/server tests cover core route behavior, but there is no single local end-to-end acceptance harness for Passport, Admin, OIDC, API v3, and SIWC together. |
| CI contract | Pass for repo and dev/preview delivery. CI runs repo validation on PRs and pushes, and `.github/workflows/supabase-deploy.yml` now provides protected check/apply paths for CubidDev migrations. |
| Supabase migrations | Pass for CubidDev. `supabase migration list --linked` now shows local and remote aligned through `20260506093000`. The protected workflow apply succeeded on 2026-05-06 and a follow-up check reported no pending migrations. |
| Supabase functions | Not applicable. This repo has no `supabase/functions` directory and the linked `CubidDev` project reports no deployed functions. |
| Supabase deployment workflow | Pass for dev/preview. GitHub environment secrets and reviewer protection were configured, `apply` ran successfully against `CubidDev`, and follow-up `check` mode succeeded. Production would need its own protected environment and approval path. |
| OIDC staging deployment | Pass. `services/oidc` is deployed to Fly as `cubid-oidc-staging`; `https://staging-id.cubid.me` resolves, has an active Fly certificate, and discovery/JWKS smoke checks pass. |
| Environment and secrets | Partial. OIDC Fly staging runtime secrets are provisioned, and Supabase dev/preview workflow secrets are configured. Broader Vault/runtime secret verification and end-to-end product smoke remain required before launch claims. |
| Git artifact hygiene | Pass. Build outputs, `.next`, `dist`, coverage, node modules, and local env files are ignored and not tracked. |
| Production readiness | Blocked for production, improved for staging. CubidDev migrations and OIDC staging are live, but production still requires separate issuer/secrets, production Supabase delivery, SDK sync, TCOIN/client seeding, Vault/runtime secret verification, and full end-to-end smoke tests. |
