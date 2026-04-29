import assert from "node:assert/strict"
import test from "node:test"

import { createEvmStampData, normalizeEvmAddress } from "./index"

test("@cubid/evm normalizes EVM wallet stamp data", () => {
  assert.equal(normalizeEvmAddress(" 0xAbC "), "0xabc")
  assert.deepEqual(createEvmStampData({ address: "0xAbC", chainId: 1 }), {
    address: "0xAbC",
    chainId: 1,
    chainType: "evm",
    identity: "0xAbC",
    normalizedAddress: "0xabc",
    uniquevalue: "0xAbC",
    walletType: "evm",
  })
})
