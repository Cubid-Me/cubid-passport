import assert from "node:assert/strict";
import test from "node:test";

import { enforceRateLimit, RateLimitError } from "./rateLimit";

type StoredBucketRow = {
  bucket_key: string;
  count: number;
  window_start: string;
};

class MockOidcSupabase {
  buckets = new Map<string, StoredBucketRow>();
  inserts: Array<Record<string, unknown>> = [];
  upserts: Array<Record<string, unknown>> = [];

  from(table: string) {
    if (table === "oidc_rate_limit_buckets") {
      const self = this;
      return {
        select() {
          return {
            eq(_column: string, value: string) {
              return {
                async maybeSingle() {
                  return {
                    data: self.buckets.get(value) ?? null,
                    error: null,
                  };
                },
              };
            },
          };
        },
        async upsert(row: Record<string, unknown>) {
          self.upserts.push(row);
          self.buckets.set(String(row.bucket_key), {
            bucket_key: String(row.bucket_key),
            count: Number(row.count),
            window_start: String(row.window_start),
          });
          return { error: null };
        },
      };
    }

    if (table === "oidc_audit_logs") {
      const self = this;
      return {
        async insert(row: Record<string, unknown>) {
          self.inserts.push(row);
          return { error: null };
        },
      };
    }

    throw new Error(`Unexpected table ${table}`);
  }
}

test("register route limit denies the 21st starter request and writes an audit log", async () => {
  const supabase = new MockOidcSupabase();

  for (let index = 0; index < 20; index += 1) {
    await enforceRateLimit(supabase as never, {
      key: "198.51.100.10",
      requestId: `oidc_req_${index}`,
      route: "register",
      tier: "starter",
    });
  }

  await assert.rejects(
    () =>
      enforceRateLimit(supabase as never, {
        key: "198.51.100.10",
        requestId: "oidc_req_blocked",
        route: "register",
        tier: "starter",
      }),
    (error: unknown) => {
      assert.ok(error instanceof RateLimitError);
      assert.equal(error.statusCode, 429);
      return true;
    }
  );

  assert.equal(supabase.inserts.length, 1);
  assert.equal(supabase.inserts[0]?.event_type, "rate_limit.denied");
});

test("logout route honors the configured trusted tier threshold", async () => {
  const supabase = new MockOidcSupabase();

  for (let index = 0; index < 120; index += 1) {
    await enforceRateLimit(supabase as never, {
      key: "trusted-client",
      requestId: `oidc_logout_${index}`,
      route: "logout",
      tier: "trusted",
    });
  }

  await assert.rejects(
    () =>
      enforceRateLimit(supabase as never, {
        key: "trusted-client",
        requestId: "oidc_logout_blocked",
        route: "logout",
        tier: "trusted",
      }),
    RateLimitError
  );
});

test("consent completion route denies the 121st trusted request and logs the denial", async () => {
  const supabase = new MockOidcSupabase();

  for (let index = 0; index < 120; index += 1) {
    await enforceRateLimit(supabase as never, {
      key: "human_subject_key_123",
      requestId: `oidc_consent_${index}`,
      route: "consent_complete",
      tier: "trusted",
    });
  }

  await assert.rejects(
    () =>
      enforceRateLimit(supabase as never, {
        key: "human_subject_key_123",
        requestId: "oidc_consent_blocked",
        route: "consent_complete",
        tier: "trusted",
      }),
    RateLimitError
  );

  assert.equal(supabase.inserts.at(-1)?.event_type, "rate_limit.denied");
});
