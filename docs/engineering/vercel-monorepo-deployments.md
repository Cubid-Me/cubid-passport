# Vercel Monorepo Deployments

Cubid deploys the Next.js apps in this repository as separate Vercel projects.
Do not deploy the repository root as a catch-all project.

## Projects

| Vercel project | Root directory | Build command | Production alias |
| --- | --- | --- | --- |
| `cubid-passport` | `apps/passport` | `pnpm build` | `passport.cubid.me` |
| `cubid-admin` | `apps/admin` | `pnpm build` | `admin.cubid.me` |

Both projects should use:

- Git repository: `Cubid-Me/cubid-passport`
- Production branch: `main`
- Node.js: `24.x`
- Install command: Vercel default for pnpm workspaces, or `pnpm install --frozen-lockfile`

## Service Boundary

`services/oidc` is not a Vercel project. It is deployed to Fly.io as the hosted
OIDC issuer for `staging-id.cubid.me` and `id.cubid.me`.

## Local Vercel CLI

The repo root may have a local ignored `.vercel/project.json` from prior manual
deployment checks. Treat it as local operator state only.

When deploying manually, run the Vercel CLI from the app workspace or pass an
explicit working directory so the intended project root is used.

## CORS

Do not add wildcard API CORS headers in Vercel config. Passport, Admin, and OIDC
API routes enforce origin policy in application code through the shared security
baseline.
