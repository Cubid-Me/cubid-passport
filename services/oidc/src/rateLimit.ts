import { ApiRateLimitError } from "@cubid/auth/server";
import type { SupabaseClient } from "@supabase/supabase-js";

type RateLimitTier = "starter" | "trusted" | "internal";

const WINDOW_MS = 60 * 1000;

const ROUTE_LIMITS: Record<string, Record<RateLimitTier, number>> = {
  authorize: { starter: 60, trusted: 300, internal: 1200 },
  consent_complete: { starter: 30, trusted: 120, internal: 600 },
  logout: { starter: 30, trusted: 120, internal: 600 },
  token: { starter: 60, trusted: 300, internal: 1200 },
  userinfo: { starter: 120, trusted: 600, internal: 2400 },
  login_complete: { starter: 30, trusted: 120, internal: 600 },
  passkey_challenge: { starter: 30, trusted: 120, internal: 600 },
  register: { starter: 20, trusted: 60, internal: 240 },
  revoke: { starter: 60, trusted: 300, internal: 1200 },
};

type BucketRow = {
  bucket_key: string;
  count: number;
  window_start: string;
};

export class RateLimitError extends ApiRateLimitError {}

function getLimit(route: string, tier: RateLimitTier): number {
  return ROUTE_LIMITS[route]?.[tier] ?? ROUTE_LIMITS[route]?.starter ?? 60;
}

function createBucketKey(route: string, key: string, windowStart: number): string {
  return `${route}:${key}:${windowStart}`;
}

export function getRateLimitKey(request: Request, fallback: string): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();

  return forwardedFor || realIp || fallback;
}

export async function enforceRateLimit(
  supabase: SupabaseClient,
  input: {
    route: string;
    key: string;
    tier?: RateLimitTier;
    requestId: string;
    clientId?: string | null;
  },
): Promise<void> {
  const tier = input.tier ?? "starter";
  const limit = getLimit(input.route, tier);

  if (tier === "internal") {
    return;
  }

  const windowStartMs = Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS;
  const windowStart = new Date(windowStartMs).toISOString();
  const bucketKey = createBucketKey(input.route, input.key, windowStartMs);

  const { data: existing, error: lookupError } = await supabase
    .from("oidc_rate_limit_buckets")
    .select("bucket_key,count,window_start")
    .eq("bucket_key", bucketKey)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Failed to load OIDC rate-limit bucket: ${lookupError.message}`);
  }

  const bucket = (existing as BucketRow | null) ?? null;
  const nextCount = (bucket?.count ?? 0) + 1;

  if (nextCount > limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((windowStartMs + WINDOW_MS - Date.now()) / 1000));

    await supabase.from("oidc_audit_logs").insert({
      log_id: `audit_${crypto.randomUUID().replace(/-/g, "")}`,
      client_id: input.clientId ?? null,
      event_type: "rate_limit.denied",
      request_id: input.requestId,
      outcome: "failure",
      actor_type: "client",
      actor_identifier: input.key,
      details: {
        route: input.route,
        tier,
        limit,
        window_start: windowStart,
      },
    });

    throw new RateLimitError(retryAfterSeconds, "Too many requests for this OIDC endpoint.");
  }

  const { error: upsertError } = await supabase.from("oidc_rate_limit_buckets").upsert({
    bucket_key: bucketKey,
    route: input.route,
    limit_key: input.key,
    tier,
    count: nextCount,
    window_start: windowStart,
    expires_at: new Date(windowStartMs + WINDOW_MS).toISOString(),
    metadata: {
      client_id: input.clientId ?? null,
    },
    updated_at: new Date().toISOString(),
  });

  if (upsertError) {
    throw new Error(`Failed to update OIDC rate-limit bucket: ${upsertError.message}`);
  }
}
