# CUBID Unified Notifications Infrastructure

## Product Requirements Document (PRD)

## Summary

CUBID will introduce a new unified notification infrastructure layer that allows third-party Apps in the CUBID ecosystem to send user notifications through user-selected communication channels.

Instead of every App independently managing email, SMS, Telegram bots, WhatsApp integrations, push notifications, and delivery preferences, Apps will delegate notification routing to CUBID.

Users will be able to:

* Choose which channels they prefer
* Choose different channels for different Apps
* Control what kinds of messages are allowed
* Revoke or modify permissions at any time

Apps will be able to:

* Send structured notifications through a single API
* Respect user preferences automatically
* Avoid storing or managing communication endpoints directly
* Leverage CUBID as shared communications infrastructure

This feature extends CUBID’s existing principles of:

* app-scoped privacy
* selective disclosure
* reusable identity infrastructure
* ecosystem collaboration
* user sovereignty over personal data  

---

# Goals

## Primary Goal

Enable Apps to send trusted, user-authorized notifications through user-selected channels without Apps needing direct ownership of the communication endpoint.

---

# Non-Goals

This system is NOT intended to:

* replace full-featured chat platforms
* become a Slack/Discord competitor
* support unrestricted marketing spam
* provide general-purpose email hosting
* become a social network

The system is primarily:

* transactional
* identity-linked
* permissioned
* preference-aware
* infrastructure-oriented

---

# Core Concept

Instead of:

```text
App -> User Email
```

The architecture becomes:

```text
App -> CUBID -> User Preferred Channel
```

The user controls:

* where messages arrive
* which Apps may message them
* what message categories are allowed
* whether multiple Apps share a destination

---

# High-Level UX

## Example

A user uses:

* FundLoop
* SmarTrust
* ChainCrew

The user decides:

* all security alerts → email
* SmarTrust contract events → Telegram
* ChainCrew community updates → Discord
* FundLoop payout alerts → SMS

Apps never need to know:

* the user’s Telegram ID
* phone number
* Discord username
* email address

Instead they only know:

* user_id
* allowed notification categories
* delivery success/failure status

This aligns strongly with CUBID’s app-scoped identity philosophy. 

---

# Supported Notification Categories

## MVP Categories

Apps must categorize every outbound notification.

### SECURITY

Examples:

* OTP
* login alerts
* password reset
* blacklisted stamp
* suspicious activity

### TRANSACTIONAL

Examples:

* payment receipt
* contract signed
* escrow updated
* milestone completed

### WORKFLOW

Examples:

* task assigned
* proposal awaiting vote
* form response received

### SOCIAL

Examples:

* mention
* DM notification
* reply notification

### SYSTEM

Examples:

* maintenance notice
* webhook failure
* API issue

### MARKETING (optional)

Examples:

* newsletters
* promotions
* announcements

This category should likely default to disabled.

---

# Appropriate Message Types

## Strongly Recommended

### Short-form transactional notifications

Examples:

* “Your escrow milestone was approved”
* “Your OTP is 482193”
* “Your vote succeeded”
* “You received a new proposal”

### Identity/security events

Examples:

* score changed
* stamp blacklisted
* new login
* account merge detected

These already align naturally with existing CUBID webhook/event concepts. 

---

# Discouraged Use Cases

## Long-form email replacement

Avoid using this infrastructure for:

* long newsletters
* blog posts
* heavy marketing campaigns
* multi-thousand-word communications

Apps should still use dedicated email systems for that.

CUBID should focus on:

* identity-aware delivery
* routing
* trust
* user control
* interoperability

---

# Core Functional Requirements

# 1. Channel Management

Users must be able to:

* add channels
* remove channels
* verify channels
* set defaults
* mute channels
* temporarily pause channels

Example channel types:

* email
* SMS
* Telegram
* Discord
* WhatsApp
* push notifications
* webhook endpoints
* Matrix
* Signal (future)
* Nostr DM (future)

---

# 2. App-Scoped Preferences

Users must be able to configure channels:

* globally
* per App
* per notification category

Example:

| App       | Category      | Channel  |
| --------- | ------------- | -------- |
| SmarTrust | TRANSACTIONAL | Telegram |
| SmarTrust | SECURITY      | Email    |
| FundLoop  | TRANSACTIONAL | SMS      |
| ChainCrew | SOCIAL        | Discord  |

---

# 3. Delivery Routing

Apps send:

* structured payload
* category
* priority
* user_id

CUBID determines:

* where to deliver
* whether delivery is allowed
* formatting rules
* fallback behavior

---

# 4. Sender Identity

Users must always know:

* which App originated the notification

Messages should appear as:

```text
[SmarTrust]
Milestone #4 was approved.
```

or:

```text
FundLoop:
Your monthly payout was completed.
```

---

# Sender Philosophy

CUBID should generally behave as infrastructure, not branding.

The originating App should remain front-and-center.

Users should not perceive:

* random messages from “Cubid”
* hidden relay behavior
* ambiguous sender identity

---

# 5. Channel Isolation

A user may choose:

* one shared Telegram destination for all Apps
  OR
* separate destinations per App

Example:

| App       | Telegram Bot   |
| --------- | -------------- |
| SmarTrust | @smartrust_bot |
| FundLoop  | @fundloop_bot  |
| ChainCrew | @chaincrew_bot |

This is important because:

* users mentally separate Apps
* trust boundaries differ
* muting behavior differs
* organizational separation matters

---

# 6. Verification & Consent

Every channel must be verified before use.

Examples:

* email OTP
* Telegram bot handshake
* Discord OAuth
* phone verification

Users must explicitly authorize:

* App access
* notification categories
* channel usage

This follows existing AllowPage principles of selective disclosure and authorization. 

---

# 7. Notification Permissions

Users must be able to:

* disable categories
* mute Apps
* pause notifications temporarily
* revoke access entirely

Apps must NOT bypass user preferences.

---

# 8. Delivery Fallbacks

Optional future feature.

Example:

* Telegram failed
* retry email
* retry SMS

User-configurable.

---

# 9. Auditability

Users must be able to see:

* which App sent what
* when
* through which channel
* delivery status

Apps should be able to query:

* delivery status
* bounced/failed state
* muted state

But NOT:

* underlying channel secrets/addresses unless authorized

---

# 10. Rate Limiting & Abuse Prevention

Critical.

Apps must NOT:

* spam users
* abuse shared infrastructure
* send unrestricted marketing

CUBID should support:

* App-level quotas
* category quotas
* per-user limits
* trust scoring
* temporary suspension

Potential future integration:

* App reputation score
* delivery trust score
* spam complaint tracking

---

# Proposed Edge Function Scope

## New Edge Function Family

Suggested namespace:

```text
/api/v2/notifications/*
```

Potential endpoints:

```text
/send_notification
/register_channel
/verify_channel
/list_channels
/update_preferences
/fetch_preferences
/fetch_delivery_log
```

---

# Suggested Notification Payload

Apps should send structured payloads rather than arbitrary text blobs.

Example:

```json
{
  "apikey": "...",
  "user_id": "...",
  "category": "TRANSACTIONAL",
  "priority": "HIGH",
  "title": "Milestone Approved",
  "body": "Milestone #4 was approved.",
  "deep_link": "smartrust://milestone/4",
  "metadata": {
    "contract_id": "123"
  }
}
```

---

# Suggested Internal Concepts

## Notification Channel

Represents:

* verified destination
* scoped permissions
* delivery metadata

Examples:

* email address
* Telegram chat
* Discord DM
* webhook endpoint

---

## Notification Preference

Maps:

* user
* app
* category
* preferred channel

---

## Notification Event

Immutable outbound event record.

Should include:

* originating app
* user
* payload
* category
* delivery attempts
* status

---

# Suggested Priority Levels

## LOW

Digestable/non-urgent

## NORMAL

Default

## HIGH

Time-sensitive

## CRITICAL

Security/OTP/account recovery

Critical notifications may bypass some mute settings.

---

# Relationship to Existing CUBID Architecture

This feature is a natural extension of:

* app-scoped identity
* selective disclosure
* AllowPage permissions
* ecosystem collaboration
* reusable infrastructure 

The notification layer should conceptually behave similarly to:

* `fetch_identity`
* `fetch_user_data`
* AllowPage permissions
* webhook subscriptions

But inverted:

* instead of Apps requesting user data,
* Apps request message delivery.

---

# Relationship to Admin Console

The Admin Console should eventually support:

* notification category registration
* webhook configuration
* rate limits
* branding
* sender formatting
* channel support toggles
* delivery analytics

This aligns naturally with the existing Admin Console philosophy of App-scoped configuration and API provisioning. 

---

# Suggested Future Features

## Notification Digests

Group low-priority notifications.

---

## AI Routing

Automatically determine best channel.

---

## Presence Awareness

Avoid sending notifications while user active in-app.

---

## Cross-App Bundling

Example:

* one daily digest from multiple ecosystem Apps.

---

## User Agent Delivery

Allow AI agents/MCP clients to receive notifications.

---

## Signed Notifications

Cryptographically verify:

* originating App
* payload integrity

---

# Security & Privacy Requirements

## Critical Principles

### App isolation

Apps must never learn another App’s channels.

### User sovereignty

Users fully control:

* channels
* permissions
* categories

### Minimal disclosure

Apps should not need raw contact information.

### Encryption

Sensitive channel identifiers should be encrypted at rest.

### Verification

Every channel must be validated.

### Revocation

Revocation must take effect immediately.

These requirements are strongly aligned with CUBID’s existing security and privacy model.  

---

# MVP Recommendation

## Start Narrow

Recommended MVP:

* Email
* Telegram

Recommended categories:

* SECURITY
* TRANSACTIONAL
* WORKFLOW

Avoid initially:

* marketing
* long-form content
* arbitrary chat systems
* group messaging

---

# Recommended UX Principle

The user experience should feel like:

> “I use CUBID to decide how Apps can reach me.”

NOT:

> “CUBID is another messaging app.”

That distinction matters enormously.
