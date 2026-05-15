# Cross-Repo Agent Comms

This folder is the live git-backed mailbox for agent-to-agent notes that span
Cubid Passport, Cubid SDK, SmarTrust, and other related repos.

## Protocol

- Use one thematic Markdown file per conversation thread.
- Every live note must have a sibling file in each corresponding repo named
  with the same date and slug.
- Each sibling must share the same `thread_id` in frontmatter.
- Frontmatter must name the related repos, sibling paths, owner repo, status,
  and last update.
- When one agent adds substantive prose to a note, that same change set must
  also edit each sibling. The sibling edit may be a short sync/reference entry
  instead of duplicating all prose.
- Do not delete or rewrite old messages. Add new dated entries under `## Log`.
- Keep old `agent-context/inbox/` or `messages-from-*` folders as legacy
  archives unless a user explicitly asks to remove them.

## Frontmatter Shape

```yaml
---
thread_id: stable-kebab-case-id
title: Human-readable thread title
status: open | waiting | resolved | archived
owner_repo: cubid-passport
related_repos:
  - cubid-passport
  - cubid-sdk-v2
sibling_notes:
  cubid-passport: agent-context/cross-repo-comms/YYYY-MM-DD-slug.md
  cubid-sdk-v2: agent-context/cross-repo-comms/YYYY-MM-DD-slug.md
last_update:
  date: YYYY-MM-DD
  actor: cubid-passport-agent
  summary: Short summary of the latest substantive change.
---
```

## Log Entry Shape

Each update should append a dated section:

```md
## Log

### YYYY-MM-DD — repo-or-agent-name

Full prose in the owner repo, or a sibling sync note that points to the owner
entry and summarizes what changed.
```

## Current Threads

- [`2026-05-13-smartrust-passkey-wallet-api-request.md`](./2026-05-13-smartrust-passkey-wallet-api-request.md):
  SmarTrust request for Cubid passkey wallet generation and signing support.
- [`2026-05-14-sdk-wallet-release-handoff.md`](./2026-05-14-sdk-wallet-release-handoff.md):
  Passport-to-SDK wallet helper and release handoff for SIWC account/signing
  APIs.
- [`2026-05-14-clearpass-dashboard-oidc-sdk-ready.md`](./2026-05-14-clearpass-dashboard-oidc-sdk-ready.md):
  SDK-to-Passport readiness note for ClearPass Dashboard Login with Cubid.
