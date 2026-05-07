import assert from "node:assert/strict"
import test from "node:test"

import {
  filterDisclosedStamps,
  isLocationDisclosed,
  isProfileNameDisclosed,
  isStampDisclosed,
  loadDappDisclosureGrants,
  sanitizeDisclosedUserProfile,
} from "../lib/server/disclosureGrants"

import { MockPassportSupabase } from "./helpers"

test("loadDappDisclosureGrants returns only active grant-backed stamp claims", async () => {
  const supabase = new MockPassportSupabase()
  supabase.appScopedSubjects.push({
    app_identifier: "dapp:42",
    app_scoped_subject: "app_subject_42",
    dapp_id: 42,
    dapp_user_uuid: "dapp_user_1",
    id: "subject_1",
    status: "active",
  })
  supabase.selectiveDisclosureGrants.push(
    {
      app_scoped_subject_id: "subject_1",
      dapp_id: 42,
      granted_claims: [
        {
          claim: "stamp:email",
          dataClass: "identity",
          purpose: "Allow Page stamp sharing",
          required: false,
        },
      ],
      granted_scopes: ["cubid:stamps"],
      id: "grant_1",
      status: "active",
    },
    {
      app_scoped_subject_id: "subject_1",
      dapp_id: 42,
      granted_claims: [
        {
          claim: "stamp:phone",
          dataClass: "identity",
          purpose: "Allow Page stamp sharing",
          required: false,
        },
      ],
      granted_scopes: ["cubid:stamps"],
      id: "grant_2",
      status: "revoked",
    }
  )

  const grants = await loadDappDisclosureGrants(supabase as never, {
    dappId: 42,
    dappUserUuid: "dapp_user_1",
  })

  assert.equal(grants.appScopedSubject, "app_subject_42")
  assert.equal(isStampDisclosed(grants, { stamptype: 13 }), true)
  assert.equal(isStampDisclosed(grants, { stamptype: 11 }), false)
  assert.deepEqual(
    filterDisclosedStamps(grants, [{ stamptype: 13 }, { stamptype: 11 }]),
    [{ stamptype: 13 }]
  )
})

test("loadDappDisclosureGrants denies by default without an app-scoped subject", async () => {
  const grants = await loadDappDisclosureGrants(
    new MockPassportSupabase() as never,
    {
      dappId: 42,
      dappUserUuid: "missing_user",
    }
  )

  assert.equal(grants.appScopedSubject, null)
  assert.equal(isStampDisclosed(grants, { stamptype: 13 }), false)
})

test("loadDappDisclosureGrants ignores legacy stamp permissions after backfill cutoff", async () => {
  const supabase = new MockPassportSupabase()
  supabase.stampPermissions.push({
    dappuser_id: "legacy_user",
    stamp_id: 99,
  })

  const grants = await loadDappDisclosureGrants(supabase as never, {
    dappId: 42,
    dappUserUuid: "legacy_user",
  })

  assert.equal(isStampDisclosed(grants, { id: 99, stamptype: 13 }), false)
  assert.equal(isStampDisclosed(grants, { id: 100, stamptype: 13 }), false)
})

test("loadDappDisclosureGrants exposes profile and location claim taxonomy", async () => {
  const supabase = new MockPassportSupabase()
  supabase.appScopedSubjects.push({
    app_identifier: "dapp:42",
    app_scoped_subject: "app_subject_42",
    dapp_id: 42,
    dapp_user_uuid: "dapp_user_1",
    id: "subject_1",
    status: "active",
  })
  supabase.selectiveDisclosureGrants.push({
    app_scoped_subject_id: "subject_1",
    dapp_id: 42,
    granted_claims: [
      {
        claim: "profile:name",
        dataClass: "identity",
        purpose: "Display name sharing",
        required: false,
      },
      {
        claim: "location:approximate",
        dataClass: "json",
        purpose: "Approximate location sharing",
        required: false,
      },
    ],
    granted_scopes: ["cubid:profile", "cubid:location"],
    id: "grant_1",
    status: "active",
  })

  const grants = await loadDappDisclosureGrants(supabase as never, {
    dappId: 42,
    dappUserUuid: "dapp_user_1",
  })

  assert.equal(isProfileNameDisclosed(grants), true)
  assert.equal(isLocationDisclosed(grants, "rough"), true)
  assert.equal(isLocationDisclosed(grants, "approximate"), true)
  assert.equal(isLocationDisclosed(grants, "exact"), false)
})

test("sanitizeDisclosedUserProfile removes non-granted profile and location fields", () => {
  const grants = {
    appScopedSubject: "app_subject_42",
    grantedClaims: new Set(["profile:name", "location:rough", "stamp:email"]),
    grantedScopes: new Set(["cubid:profile", "cubid:location", "cubid:stamps"]),
    grantedStampTypes: new Set(["email"]),
    hasStampScope: true,
  }

  assert.deepEqual(
    sanitizeDisclosedUserProfile(
      {
        address: { city: "Toronto", coordinates: { lat: 43.65, lon: -79.38 } },
        cubid_country: "Canada",
        cubid_postalcode: "M5V",
        email: "person@example.com",
        id: 123,
        nickname: "Person",
        phone: "+15555550100",
      },
      grants
    ),
    {
      address: null,
      cubid_country: "Canada",
      cubid_postalcode: null,
      email: "person@example.com",
      nickname: "Person",
      phone: null,
    }
  )
})
