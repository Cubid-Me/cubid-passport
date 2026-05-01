import assert from "node:assert/strict";
import test from "node:test";

import {
  createStampPermissionDescriptor,
  getStampTypeId,
  getStampTypeName,
  normalizeDisclosedStamp,
} from "./index";

test("getStampTypeId resolves canonical and alias stamp names", () => {
  assert.equal(getStampTypeId("email"), 13);
  assert.equal(getStampTypeId("near"), 15);
  assert.equal(getStampTypeId("near-wallet"), 15);
  assert.equal(getStampTypeId("linkedin"), 22);
  assert.equal(getStampTypeId("unknown"), null);
});

test("getStampTypeName returns stable names for stamp ids", () => {
  assert.equal(getStampTypeName(13), "email");
  assert.equal(getStampTypeName(15), "near");
  assert.equal(getStampTypeName(999), "999");
});

test("createStampPermissionDescriptor validates permission identity", () => {
  assert.deepEqual(createStampPermissionDescriptor({
    dappUserId: "dapp-user-1",
    stampId: 13,
  }), {
    dappUserId: "dapp-user-1",
    stampId: 13,
  });

  assert.throws(() => createStampPermissionDescriptor({ dappUserId: "", stampId: 13 }));
  assert.throws(() => createStampPermissionDescriptor({ dappUserId: "dapp-user-1", stampId: 0 }));
});

test("normalizeDisclosedStamp maps raw rows to app-safe stamp summaries", () => {
  assert.deepEqual(normalizeDisclosedStamp({
    identity: "person@example.com",
    is_valid: true,
    stamptype: 13,
    uniquevalue: "fallback@example.com",
  }), {
    stampType: "email",
    stampTypeId: 13,
    status: "Verified",
    value: "person@example.com",
  });
});
