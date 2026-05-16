# Repo Status

Last updated: 2026-05-16T05:30:39Z

| Requirement | Status |
| --- | --- |
| Branch workflow | Pass. `AGENTS.md` requires feature branches, PRs to `dev` by default, and session-log entries before commits. |
| README accuracy | Partial. README reflects the current platform state, but production readiness still depends on production deployment, secrets, and smoke checks. Staging OIDC and dev/preview Supabase delivery are now represented in the engineering docs. |
| License | Missing. No root `LICENSE` file is present; add one if this private repo needs an explicit license posture. |
| Session log | Pass. `agent-context/session-log.md` exists and is current through the latest hosted-readiness reconciliation work. |
| Roadmap metadata | Pass. Most todos are completed or ingested into `Cubid-Me/cubid-sdk`; `F01` is complete for CubidDev, and `C04.1.1` was completed in PR #166 after hosted preflight confirmed active dapps had hashed `dapp_api_keys` rows. |
| Future ideas guardrail | Pass. `agent-context/future-ideas.md` exists and clearly states it is deferred reference material, not an active roadmap. |
| SDK boundary | Pass. `AGENTS.md` and README direct public SDK implementation to `Cubid-Me/cubid-sdk` and keep `packages/core` as a historical snapshot only. |
| Engineering docs | Pass. Current architecture and operating docs live under `docs/engineering/`; no target-state docs were found outside the expected docs area during this pass. |
| Testing strategy | Partial. Root scripts run lint, typecheck, test, build, and security checks; some chain placeholder packages still have no real tests. |
| Local acceptance harness | Partial. Unit/server tests cover core route behavior, but there is no single local end-to-end acceptance harness for Passport, Admin, OIDC, API v3, and SIWC together. |
| CI contract | Pass for repo and dev/preview delivery. CI runs repo validation on PRs and pushes, and `.github/workflows/supabase-deploy.yml` now provides protected check/apply paths for CubidDev migrations. |
| Supabase migrations | Pass for CubidDev. Protected apply run `25953794914` succeeded on 2026-05-16, and follow-up check run `25953809761` reported `Remote database is up to date` with local and remote aligned through `20260515175000`. |
| Supabase functions | Not applicable. This repo has no `supabase/functions` directory and the linked `CubidDev` project reports no deployed functions. |
| Supabase deployment workflow | Pass for dev/preview. GitHub environment secrets and reviewer protection were configured, `apply` ran successfully against `CubidDev`, and follow-up `check` mode succeeded. Production would need its own protected environment and approval path. |
| OIDC staging deployment | Pass. `services/oidc` is deployed to Fly as `cubid-oidc-staging`; `https://staging-id.cubid.me` resolves, has an active Fly certificate, and discovery/JWKS smoke checks pass. |
| Environment and secrets | Partial. OIDC Fly staging runtime secrets are provisioned, and Supabase dev/preview workflow secrets are configured. Passport Preview(dev) has the core Supabase/Firebase/Passport env names, but no `SMTP_*` or `TELEGRAM_BOT_*` variables were visible through Vercel env listing on 2026-05-16, so full flexible-messaging provider smoke remains blocked until provider secrets are provisioned. |
| Git artifact hygiene | Pass. Build outputs, `.next`, `dist`, coverage, node modules, and local env files are ignored and not tracked. |
| Hosted flexible messaging smoke | Partial. On 2026-05-16, protected Vercel preview smoke reached `/api/v3/notifications/send`, `/api/v3/notifications/status`, and `/api/notifications/history/list`; each returned structured Passport API envelopes with `X-Request-Id` for malformed, invalid dapp key, or missing Firebase bearer-token paths. Full happy-path smoke is still blocked by missing provider env visibility/secrets and lack of a documented hosted test dapp/user credential bundle. |
| Production readiness | Blocked for production, improved for staging. CubidDev delivery automation, current migrations, and OIDC staging are live, and PR #166 completed the repo-side flexible messaging and legacy API-key cleanup work. Production still requires flexible messaging provider secret provisioning, full hosted happy-path smoke tests, separate production issuer/secrets, SDK sync, and production Supabase delivery evidence. |
