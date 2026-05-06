# Supabase Hosted Delivery

This repo owns Supabase migrations for the private Cubid platform backend. Hosted
database changes must go through the protected GitHub workflow, not ad hoc local
shell mutation.

## Target

- Preview/dev project: `CubidDev`
- Project ref: `cggycnbvljcdptzyjpju`
- Current repo status as of 2026-05-06: local migrations exist through
  `20260506093000`, while `CubidDev` reports only `20260331020028` applied.
  A local dry-run lists 25 pending migrations.

There is no `supabase/functions` directory in this repo, so Edge Function
deployment is currently not applicable.

## Required GitHub Configuration

Configure the selected GitHub Environment, recommended
`Preview – cubid-passport`, with:

- secret `SUPABASE_ACCESS_TOKEN`
- secret `SUPABASE_DB_PASSWORD`
- environment variable `CUBID_SUPABASE_PROJECT_REF`

Set `CUBID_SUPABASE_PROJECT_REF` to `cggycnbvljcdptzyjpju` for
`Preview – cubid-passport`. The environment should require reviewer approval
before `apply` runs.

## Workflow

Use `.github/workflows/supabase-deploy.yml`.

- Pull requests run a migration dry-run when `SUPABASE_ACCESS_TOKEN`,
  `SUPABASE_DB_PASSWORD`, and `CUBID_SUPABASE_PROJECT_REF` are available. If
  they are not configured yet, the workflow emits a warning instead of blocking
  unrelated docs/setup PRs.
- Manual dispatch with `mode=check` lists remote migration history and performs
  `supabase db push --dry-run`.
- Manual dispatch with `mode=apply` requires:
  - `confirm_project_ref` equal to the target project ref
  - `confirm_recent_backup` exactly equal to
    `I confirmed a completed recent backup`
  - a completed backup visible from `supabase backups list` in the last 36 hours

The workflow logs backup posture and migration status before applying pending
migrations.

## Operator Checklist Before Apply

1. Confirm the workflow environment has `SUPABASE_ACCESS_TOKEN`.
2. Confirm the workflow environment has `SUPABASE_DB_PASSWORD`.
3. Confirm the workflow environment has `CUBID_SUPABASE_PROJECT_REF`.
4. Confirm the GitHub Environment has reviewer protection for applies.
5. Run workflow dispatch with `mode=check`.
6. Confirm `supabase backups list` shows a recent `COMPLETED` backup.
7. Run workflow dispatch with `mode=apply` only after the check output is
   understood.
8. After apply, run app smoke checks for Passport, Admin, OIDC, API v3, and
   SIWC surfaces before enabling broader usage.
