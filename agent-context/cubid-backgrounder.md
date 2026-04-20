Here’s a clean, agent-oriented `backgrounder-for-agents.md` you can drop into your repo:

---

# Cubid Backgrounder (for Coding Agents)

This document provides essential context about Cubid.
**Read this before making product, design, or architecture decisions.**

Cubid is not “just another app.” It is **public-good identity infrastructure** designed to solve proof-of-personhood and Sybil resistance at internet scale.

---

## Primary user: who is this for?

### 1. End users (humans)

* People who want to **prove they are unique, real humans**
* Privacy-conscious users who want **control over their identity data**
* Users who benefit from **reusable identity across apps**

### 2. Developers / apps (core customer)

* Founders building apps that need:

  * One-person-one-account
  * Bot resistance
  * Fair distribution (airdrops, voting, UBI, etc.)

### 3. Secondary identities

* **Agents (AI systems)** → can identify themselves explicitly as non-human
* **Organizations** → can have identities distinct from humans

👉 Key idea:
Humans are the *audience*, but **developers are the primary customers**.

---

## Primary goal: what must they do?

### For users

* Build a **Cubid identity (“passport”)**
* Add and verify **stamps** (email, phone, wallet, etc.)
* Grant **selective access** to apps via the Allow Page
* Increase their **personhood score**

### For apps

* Integrate Cubid via:

  * API (REST)
  * React SDK
  * MCP (Model Context Protocol) for agents
* Use Cubid to:

  * Create users
  * Query identity + score
  * Enforce access / trust rules

👉 Core action loop:

1. App creates user
2. User authorizes data sharing
3. App queries score / identity
4. App adapts behavior

---

## Business goal: what does success look like?

Success is **not** page views or engagement.

Success = **adoption of the protocol**

### Key indicators:

* # of integrated apps
* # of verified users (high score)
* # of identity interactions (API usage)
* Reduction in:

  * Bots
  * Fake accounts
  * Sybil attacks

### Strategic outcome:

* Cubid becomes the **default identity + trust layer of the internet**

👉 Important:
Cubid is **infrastructure**, not a destination product. 

---

## Content: what is real copy/data?

### Real data (source of truth)

* Stamps (email, phone, wallet, etc.)
* Score (probabilistic proof-of-personhood)
* Permissions (what user shares with each app)
* Webhook events (identity changes)

### Generated / derived data

* “Human score”
* Boolean checks (e.g. is_human, is_adult)
* App-specific scoring overlays

### Not real / should not be hardcoded

* Identity assumptions
* Cross-app identifiers
* Persistent user PII in app databases

👉 Principle:
Apps should **store only `user_id`** and fetch everything else dynamically.

---

## Brand signals: colours / logo / type / voice

### Brand traits

* **Trustworthy but not institutional**
* **Technical but accessible**
* **Privacy-first, user-empowering**
* **Open ecosystem, not walled garden**

### Voice

* Clear, direct, slightly informal
* Avoid jargon unless necessary
* Emphasize:

  * Control
  * Privacy
  * Collaboration
  * Global scale

### Conceptual metaphors

* “Passport”
* “Stamps”
* “Score”
* “Identity you own”

👉 Avoid:

* Corporate KYC tone
* Surveillance vibes
* “We own your data” implications

---

## Constraints

### Tech stack

* **Frontend:** Next.js
* **Backend:** Supabase (Postgres + auth + storage)
* **APIs:** REST (CUBID API v2)
* **SDK:** React-based
* **Agent support:** MCP-compatible interfaces

---

### Architecture principles

* API-first system
* Stateless integrations where possible
* App-scoped user IDs (no global identifiers)
* Zero-knowledge / minimal disclosure
* Event-driven (webhooks)

---

### Privacy & security (non-negotiable)

* Do NOT store unnecessary user data
* Always respect:

  * App-scoped identity
  * User-controlled disclosure
* Assume:

  * Data minimization is required
  * Breaches will happen → design defensively

---

### Accessibility target

* Aim for **WCAG 2.1 AA minimum**
* Low-friction onboarding (critical for adoption)
* Avoid CAPTCHA-like UX unless absolutely necessary

---

### Product constraints

* Must work globally
* Must support:

  * Anonymous users
  * No-ID users (paperless population)
* Must remain:

  * Modular
  * Opt-in
  * Non-prescriptive

---

### Timeline reality

* Current version (non-canonical):
  [https://passport.cubid.me](https://passport.cubid.me)
* Expect:

  * Iteration
  * Incomplete features
  * Evolving APIs

👉 Build for **change**, not stability.

---

## Mental model (critical)

Cubid is:

* ✅ A **protocol**
* ✅ A **trust network**
* ✅ A **shared identity layer**

Cubid is NOT:

* ❌ A login system
* ❌ A social network
* ❌ A centralized identity provider

---

## Key concepts agents must respect

### 1. App-scoped identity

* Same user ≠ same ID across apps
* Prevents cross-app tracking

### 2. Stamps

* Atomic identity proofs
* Can be verified, blacklisted, or expired

### 3. Score

* Probabilistic “humanness”
* Not binary truth

### 4. Selective disclosure

* Users control what each app sees

### 5. Collaboration

* Apps strengthen each other’s trust signals

---

## Anti-goals (do NOT build toward)

* Centralized identity ownership
* Cross-app user tracking
* Heavy KYC-first flows
* Friction-heavy onboarding
* App-specific identity silos

---

## If unsure, default to:

* Less data collection
* More user control
* API-driven design
* Composability over rigidity
* Protocol thinking over product thinking

---

If you’re making a decision and it conflicts with:

* privacy → privacy wins
* user control → user wins
* protocol openness → openness wins

---

EOD
