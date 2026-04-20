import { createHash, randomBytes } from "node:crypto";

import type { CubidWebAuthnUserHandlePayload } from "./contracts";

export * from "./contracts";

export function base64UrlEncode(input: Uint8Array): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function base64UrlDecode(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Uint8Array.from(Buffer.from(`${normalized}${padding}`, "base64"));
}

export function generateRandomToken(byteLength = 32): string {
  return base64UrlEncode(randomBytes(byteLength));
}

export function createCubidWebAuthnUserHandle(payload: CubidWebAuthnUserHandlePayload): string {
  return base64UrlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
}

export function parseCubidWebAuthnUserHandle(userHandle: string): CubidWebAuthnUserHandlePayload {
  let decodedValue: unknown;

  try {
    decodedValue = JSON.parse(Buffer.from(base64UrlDecode(userHandle)).toString("utf8"));
  } catch {
    throw new Error("Invalid Cubid WebAuthn user handle.");
  }

  if (
    typeof decodedValue !== "object" ||
    decodedValue === null ||
    typeof (decodedValue as { humanSubjectKey?: unknown }).humanSubjectKey !== "string" ||
    !(typeof (decodedValue as { cubidUserId?: unknown }).cubidUserId === "number"
      || (decodedValue as { cubidUserId?: unknown }).cubidUserId === null)
  ) {
    throw new Error("Invalid Cubid WebAuthn user handle.");
  }

  return {
    humanSubjectKey: (decodedValue as { humanSubjectKey: string }).humanSubjectKey,
    cubidUserId: (decodedValue as { cubidUserId: number | null }).cubidUserId,
  };
}

export function generatePkceVerifier(length = 96): string {
  let verifier = "";

  while (verifier.length < length) {
    verifier += generateRandomToken(32);
  }

  return verifier.slice(0, length);
}

export function derivePkceChallenge(verifier: string): string {
  const hash = createHash("sha256").update(verifier).digest();
  return base64UrlEncode(hash);
}

export function verifyPkceChallenge(verifier: string, challenge: string): boolean {
  return derivePkceChallenge(verifier) === challenge;
}
