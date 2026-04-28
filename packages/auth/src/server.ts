import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { z, type ZodTypeAny } from "zod";

export { z };
export type { ZodTypeAny };

export type ApiActorType =
  | "anonymous"
  | "user"
  | "admin"
  | "dapp"
  | "oidc_client"
  | "internal";

export interface ApiRequestContext {
  actorType: ApiActorType;
  bearerToken: string | null;
  ip: string | null;
  method: string;
  origin: string | null;
  requestId: string;
}

export interface ApiRateLimitAdapterInput {
  actorIdentifier?: string | null;
  actorType?: ApiActorType | null;
  clientId?: string | null;
  key: string;
  requestId: string;
  route: string;
  tier?: string | null;
}

export interface ApiRateLimitAdapter {
  enforce(input: ApiRateLimitAdapterInput): Promise<void>;
}

const DAPP_API_KEY_PREFIX = "cubid_live";
const DAPP_API_KEY_SCRYPT_VERSION = "scrypt:v1";
const DAPP_API_KEY_SHA256_VERSION = "sha256:v1";

export type DappApiKeyMaterial = {
  apiKey: string;
  keyHash: string;
  keyPrefix: string;
};

export type Aes256GcmEnvelopeContext = Record<string, string | number | boolean | null>;

export type Aes256GcmEnvelopePayload = {
  ciphertext: string;
  iv: string;
  authTag: string;
  wrappedDataKey: string;
  wrappedDataKeyIv: string;
  wrappedDataKeyAuthTag: string;
  algorithm: "aes-256-gcm-envelope";
  keyId: string;
  keyVersion: number;
  purpose: string;
};

type HeaderValue = string | string[] | undefined;

type HeaderSource =
  | Pick<NextApiRequest, "headers">
  | Pick<Request, "headers">;

function isFetchHeaders(headers: HeaderSource["headers"]): headers is Headers {
  return typeof (headers as Headers).get === "function";
}

export class ApiSecurityError extends Error {
  code: string;
  details?: Record<string, unknown>;
  headers?: Record<string, string>;
  statusCode: number;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    options?: {
      details?: Record<string, unknown>;
      headers?: Record<string, string>;
    }
  ) {
    super(message);
    this.name = "ApiSecurityError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = options?.details;
    this.headers = options?.headers;
  }
}

export class ApiRateLimitError extends ApiSecurityError {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number, message = "Too many requests.") {
    super(429, "rate_limit_exceeded", message, {
      headers: {
        "retry-after": String(retryAfterSeconds),
      },
    });
    this.name = "ApiRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function readHeaderValue(source: HeaderSource, name: string): string | null {
  if (isFetchHeaders(source.headers)) {
    return source.headers.get(name);
  }

  const rawValue = source.headers[name.toLowerCase()] as HeaderValue;

  if (Array.isArray(rawValue)) {
    return rawValue[0] ?? null;
  }

  return rawValue ?? null;
}

export function createRequestId(prefix: string, candidate?: string | null) {
  const trimmedCandidate = candidate?.trim();

  if (trimmedCandidate) {
    return trimmedCandidate;
  }

  return `${prefix}_${randomUUID()}`;
}

export function parseDappApiKeyPrefix(apiKey: string) {
  const trimmed = apiKey.trim();
  const parts = trimmed.split("_");

  if (parts.length >= 4 && parts[0] === "cubid" && parts[1] === "live") {
    return parts[2] || null;
  }

  return trimmed.slice(0, 12) || null;
}

export function hashDappApiKey(apiKey: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(apiKey, salt, 64).toString("hex");
  return `${DAPP_API_KEY_SCRYPT_VERSION}:${salt}:${hash}`;
}

export function hashLegacyDappApiKey(apiKey: string) {
  return `${DAPP_API_KEY_SHA256_VERSION}:${createHash("sha256")
    .update(apiKey)
    .digest("hex")}`;
}

export function verifyDappApiKey(apiKey: string, storedHash: string) {
  const parts = storedHash.split(":");

  if (parts[0] === "scrypt" && parts[1] === "v1") {
    const [, , salt, expectedHash] = parts;

    if (!salt || !expectedHash) {
      return false;
    }

    const actualHash = scryptSync(apiKey, salt, 64);
    const expectedBuffer = Buffer.from(expectedHash, "hex");

    if (actualHash.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(actualHash, expectedBuffer);
  }

  if (parts[0] === "sha256" && parts[1] === "v1") {
    const expectedHash = parts[2];

    if (!expectedHash) {
      return false;
    }

    const actualBuffer = Buffer.from(
      createHash("sha256").update(apiKey).digest("hex"),
      "hex"
    );
    const expectedBuffer = Buffer.from(expectedHash, "hex");

    if (actualBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(actualBuffer, expectedBuffer);
  }

  return false;
}

export function generateDappApiKey(): DappApiKeyMaterial {
  const keyPrefix = randomBytes(8).toString("hex");
  const secret = randomBytes(32).toString("base64url");
  const apiKey = `${DAPP_API_KEY_PREFIX}_${keyPrefix}_${secret}`;

  return {
    apiKey,
    keyHash: hashDappApiKey(apiKey),
    keyPrefix,
  };
}

const toBase64 = (value: Buffer) => value.toString("base64");

const fromBase64 = (value: string) => Buffer.from(value, "base64");

export function decodeAes256GcmEnvelopeKey(encodedKey: string, label = "key") {
  const trimmed = encodedKey.trim();
  const decoded = Buffer.from(trimmed, "base64");

  if (decoded.length === 32) {
    return decoded;
  }

  const base64UrlDecoded = Buffer.from(
    trimmed.replace(/-/g, "+").replace(/_/g, "/"),
    "base64"
  );

  if (base64UrlDecoded.length === 32) {
    return base64UrlDecoded;
  }

  throw new Error(`${label} must decode to exactly 32 bytes.`);
}

export function buildAes256GcmEnvelopeAad(
  purpose: string,
  context: Aes256GcmEnvelopeContext
) {
  return Buffer.from(
    JSON.stringify({
      context,
      purpose,
    }),
    "utf8"
  );
}

export function encryptAes256GcmEnvelope(
  plaintext: string,
  wrappingKey: Buffer,
  options: {
    context: Aes256GcmEnvelopeContext;
    keyId: string;
    keyVersion: number;
    purpose: string;
  }
): Aes256GcmEnvelopePayload {
  if (wrappingKey.length !== 32) {
    throw new Error("AES-256-GCM envelope wrapping key must be 32 bytes.");
  }

  const dataKey = randomBytes(32);
  const iv = randomBytes(12);
  const wrapIv = randomBytes(12);
  const aad = buildAes256GcmEnvelopeAad(options.purpose, options.context);

  const cipher = createCipheriv("aes-256-gcm", dataKey, iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const wrapCipher = createCipheriv("aes-256-gcm", wrappingKey, wrapIv);
  wrapCipher.setAAD(aad);
  const wrappedDataKey = Buffer.concat([
    wrapCipher.update(dataKey),
    wrapCipher.final(),
  ]);
  const wrappedDataKeyAuthTag = wrapCipher.getAuthTag();
  dataKey.fill(0);

  return {
    algorithm: "aes-256-gcm-envelope",
    authTag: toBase64(authTag),
    ciphertext: toBase64(ciphertext),
    iv: toBase64(iv),
    keyId: options.keyId,
    keyVersion: options.keyVersion,
    purpose: options.purpose,
    wrappedDataKey: toBase64(wrappedDataKey),
    wrappedDataKeyAuthTag: toBase64(wrappedDataKeyAuthTag),
    wrappedDataKeyIv: toBase64(wrapIv),
  };
}

export function decryptAes256GcmEnvelope(
  envelope: Aes256GcmEnvelopePayload,
  wrappingKey: Buffer,
  context: Aes256GcmEnvelopeContext
) {
  if (wrappingKey.length !== 32) {
    throw new Error("AES-256-GCM envelope wrapping key must be 32 bytes.");
  }

  if (envelope.algorithm !== "aes-256-gcm-envelope") {
    throw new Error(`Unsupported envelope algorithm ${envelope.algorithm}.`);
  }

  const aad = buildAes256GcmEnvelopeAad(envelope.purpose, context);
  const wrapDecipher = createDecipheriv(
    "aes-256-gcm",
    wrappingKey,
    fromBase64(envelope.wrappedDataKeyIv)
  );
  wrapDecipher.setAAD(aad);
  wrapDecipher.setAuthTag(fromBase64(envelope.wrappedDataKeyAuthTag));
  const dataKey = Buffer.concat([
    wrapDecipher.update(fromBase64(envelope.wrappedDataKey)),
    wrapDecipher.final(),
  ]);

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      dataKey,
      fromBase64(envelope.iv)
    );
    decipher.setAAD(aad);
    decipher.setAuthTag(fromBase64(envelope.authTag));
    return Buffer.concat([
      decipher.update(fromBase64(envelope.ciphertext)),
      decipher.final(),
    ]).toString("utf8");
  } finally {
    dataKey.fill(0);
  }
}

export function getRequestIdFromNextRequest(
  req: Pick<NextApiRequest, "headers">,
  prefix: string
) {
  return createRequestId(prefix, readHeaderValue(req, "x-request-id"));
}

export function getRequestIdFromFetchRequest(
  request: Pick<Request, "headers">,
  prefix: string
) {
  return createRequestId(prefix, readHeaderValue(request, "x-request-id"));
}

export function getBearerToken(
  requestOrHeaders:
    | Pick<NextApiRequest, "headers">
    | Pick<Request, "headers">
    | string
    | null
    | undefined
) {
  const authorizationHeader =
    typeof requestOrHeaders === "string"
      ? requestOrHeaders
      : requestOrHeaders
        ? readHeaderValue(requestOrHeaders, "authorization")
        : null;

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length).trim() || null;
}

export function getRequestOrigin(request: HeaderSource) {
  const origin = readHeaderValue(request, "origin");
  return origin?.trim() || null;
}

export function getRequestIp(
  request: HeaderSource,
  fallback: string | null = null
) {
  const forwardedFor = readHeaderValue(request, "x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const realIp = readHeaderValue(request, "x-real-ip")?.trim();

  return forwardedFor || realIp || fallback;
}

export function assertAllowedMethod(method: string, allowedMethods: string[]) {
  if (allowedMethods.includes(method.toUpperCase())) {
    return;
  }

  throw new ApiSecurityError(405, "method_not_allowed", "Method not allowed", {
    details: {
      allowedMethods,
    },
    headers: {
      Allow: allowedMethods.join(", "),
    },
  });
}

export function assertAllowedOrigin(
  origin: string | null,
  allowedOrigins: string[],
  options?: {
    allowMissingOrigin?: boolean;
  }
) {
  if (!origin) {
    if (options?.allowMissingOrigin === false) {
      throw new ApiSecurityError(
        403,
        "origin_required",
        "Origin header is required."
      );
    }

    return null;
  }

  if (allowedOrigins.includes(origin)) {
    return origin;
  }

  throw new ApiSecurityError(
    403,
    "origin_not_allowed",
    "Origin is not allowed for this API.",
    {
      details: {
        origin,
      },
    }
  );
}

export function createCorsHeaders(
  origin: string | null,
  allowedMethods: string[],
  options?: {
    allowedHeaders?: string[];
    maxAgeSeconds?: number;
  }
) {
  if (!origin) {
    return {} as Record<string, string>;
  }

  const allowedHeaders = options?.allowedHeaders ?? [
    "authorization",
    "content-type",
    "x-request-id",
  ];

  return {
    "access-control-allow-headers": allowedHeaders.join(", "),
    "access-control-allow-methods": allowedMethods.join(", "),
    "access-control-allow-origin": origin,
    "access-control-max-age": String(options?.maxAgeSeconds ?? 600),
    vary: "Origin",
  };
}

export function setNextApiHeaders(
  res: Pick<NextApiResponse, "setHeader">,
  headers: Record<string, string>
) {
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
}

export function setNextApiRequestId(
  res: Pick<NextApiResponse, "setHeader">,
  requestId: string
) {
  res.setHeader("X-Request-Id", requestId);
}

export function buildApiRequestContext(
  request:
    | Pick<NextApiRequest, "headers" | "method">
    | Pick<Request, "headers" | "method">,
  actorType: ApiActorType,
  requestId: string,
  ipFallback?: string | null
): ApiRequestContext {
  return {
    actorType,
    bearerToken: getBearerToken(request),
    ip: getRequestIp(request, ipFallback),
    method: request.method?.toUpperCase() ?? "GET",
    origin: getRequestOrigin(request),
    requestId,
  };
}

function formatZodError(error: z.ZodError) {
  return error.issues.map((issue) => ({
    code: issue.code,
    message: issue.message,
    path: issue.path.join("."),
  }));
}

export function validateWithSchema<TSchema extends ZodTypeAny>(
  value: unknown,
  schema: TSchema,
  message = "Request validation failed."
) {
  const parsed = schema.safeParse(value);

  if (parsed.success) {
    return parsed.data;
  }

  throw new ApiSecurityError(400, "invalid_request", message, {
    details: {
      issues: formatZodError(parsed.error),
    },
  });
}

export async function parseJsonBody<TSchema extends ZodTypeAny>(
  request: Request,
  schema: TSchema,
  message = "Request validation failed."
) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new ApiSecurityError(
      400,
      "invalid_request",
      "Request body must be valid JSON."
    );
  }

  return validateWithSchema(body, schema, message);
}

export function buildAppErrorEnvelope(
  requestId: string,
  error: unknown,
  fallbackMessage = "Unexpected server error"
) {
  if (error instanceof ApiSecurityError) {
    return {
      body: {
        error: {
          code: error.code,
          message: error.message,
          requestId,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      headers: {
        ...(error.headers ?? {}),
      },
      statusCode: error.statusCode,
    };
  }

  return {
    body: {
      error: {
        code: "server_error",
        message: fallbackMessage,
        requestId,
      },
    },
    headers: {},
    statusCode: 500,
  };
}

export function buildOidcErrorEnvelope(
  requestId: string,
  error: unknown,
  fallbackMessage = "Unable to process OIDC request."
) {
  if (error instanceof ApiSecurityError) {
    return {
      body: {
        error: error.code,
        error_description: error.message,
      },
      headers: {
        ...(error.headers ?? {}),
        "x-request-id": requestId,
      },
      statusCode: error.statusCode,
    };
  }

  return {
    body: {
      error: "server_error",
      error_description:
        error instanceof Error ? error.message : fallbackMessage,
    },
    headers: {
      "x-request-id": requestId,
    },
    statusCode: 500,
  };
}

export async function enforceApiRateLimit(
  adapter: ApiRateLimitAdapter,
  input: ApiRateLimitAdapterInput
) {
  await adapter.enforce(input);
}
