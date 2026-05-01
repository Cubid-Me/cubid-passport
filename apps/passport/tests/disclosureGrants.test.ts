import assert from "node:assert/strict"
import test from "node:test"

import {
  filterDisclosedStamps,
  isStampDisclosed,
  loadDappDisclosureGrants,
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
