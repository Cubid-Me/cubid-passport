import type { JWTPayload, KeyLike } from "jose";
import {
  SignJWT,
  importJWK,
  jwtVerify,
} from "jose";

import { getOidcRuntimeConfig } from "./config";

type JsonWebKey = Record<string, unknown>;

let cachedSigningMaterial: Promise<{
  kid: string;
  privateKey: KeyLike | Uint8Array;
  publicJwk: JsonWebKey;
}> | null = null;

const PRIVATE_JWK_FIELDS = new Set(["d", "p", "q", "dp", "dq", "qi", "oth", "k"]);

function normalizeKid(privateJwk: JsonWebKey, configuredKid: string | null): string {
  const jwkKid = typeof privateJwk.kid === "string" && privateJwk.kid.trim() ? privateJwk.kid.trim() : null;
  const kid = configuredKid ?? jwkKid;

  if (!kid) {
    throw new Error("OIDC_ACTIVE_SIGNING_KID or signing private JWK kid is required.");
  }

  return kid;
}

function toPublicJwk(jwk: JsonWebKey, kid: string): JsonWebKey {
  const publicJwk: JsonWebKey = {};

  for (const [key, value] of Object.entries(jwk)) {
    if (!PRIVATE_JWK_FIELDS.has(key)) {
      publicJwk[key] = value;
    }
  }

  return {
    ...publicJwk,
    kid,
    alg: "RS256",
    use: "sig",
  };
}

export async function getActiveSigningMaterial() {
  if (!cachedSigningMaterial) {
    cachedSigningMaterial = (async () => {
      const config = getOidcRuntimeConfig();

      if (!config.signingPrivateJwk) {
        throw new Error("OIDC_SIGNING_PRIVATE_JWK_JSON is required for token signing.");
      }

      const kid = normalizeKid(config.signingPrivateJwk, config.activeSigningKid);
      const privateKey = await importJWK(
        {
          ...config.signingPrivateJwk,
          kid,
          alg: "RS256",
          use: "sig",
        },
        "RS256",
      );

      return {
        kid,
        privateKey,
        publicJwk: toPublicJwk(config.signingPrivateJwk, kid),
      };
    })();
  }

  return cachedSigningMaterial;
}

export async function createOidcJwks(): Promise<{ keys: JsonWebKey[] }> {
  const config = getOidcRuntimeConfig();

  if (!config.signingPrivateJwk) {
    return {
      keys: config.jwks.keys as JsonWebKey[],
    };
  }

  const material = await getActiveSigningMaterial();
  return {
    keys: [material.publicJwk],
  };
}

export async function signOidcJwt(
  payload: JWTPayload,
  options: {
    audience: string;
    expiresInSeconds: number;
    jwtId: string;
    subject: string;
  },
): Promise<string> {
  const config = getOidcRuntimeConfig();
  const material = await getActiveSigningMaterial();

  return new SignJWT(payload)
    .setProtectedHeader({
      alg: "RS256",
      kid: material.kid,
      typ: "JWT",
    })
    .setIssuer(config.issuer)
    .setAudience(options.audience)
    .setSubject(options.subject)
    .setIssuedAt()
    .setExpirationTime(`${options.expiresInSeconds}s`)
    .setJti(options.jwtId)
    .sign(material.privateKey);
}

export async function verifyOidcJwt(token: string, audience: string) {
  const config = getOidcRuntimeConfig();
  const material = await getActiveSigningMaterial();
  const publicKey = await importJWK(material.publicJwk, "RS256");

  return jwtVerify(token, publicKey, {
    issuer: config.issuer,
    audience,
  });
}
