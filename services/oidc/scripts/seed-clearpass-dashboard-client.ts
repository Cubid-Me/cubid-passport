import { randomBytes } from "node:crypto";

import { getOidcRuntimeConfig } from "../src/config";
import {
  hashOidcSecret,
  normalizePostLogoutRedirectUris,
  normalizeRedirectUris,
} from "../src/registration";
import { getOidcSupabase } from "../src/supabase";

const CLIENT_STATUSES = new Set(["active", "suspended", "revoked"]);
const RATE_LIMIT_TIERS = new Set(["starter", "trusted", "internal"]);

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function splitCsv(value: string): string[] {
  return [...new Set(value.split(",").map((entry) => entry.trim()).filter(Boolean))];
}

function getOptionalCsv(name: string): string[] | undefined {
  const value = process.env[name];
  return typeof value === "string" ? splitCsv(value) : undefined;
}

function getOptionalString(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function getOptionalEnum(name: string, allowedValues: Set<string>): string | undefined {
  const value = process.env[name]?.trim();
  if (!value) {
    return undefined;
  }

  if (!allowedValues.has(value)) {
    throw new Error(`${name} must be one of: ${[...allowedValues].join(", ")}.`);
  }

  return value;
}

function getSeedIssuer(): string {
  return getOptionalString("OIDC_PUBLIC_ORIGIN") ?? getRequiredEnv("OIDC_ISSUER_URL");
}

function buildMetadata(): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    integration: "clearpass_dashboard",
    seeded_by: "@cubid/oidc seed:clearpass-dashboard",
    sdk_packages: ["@cubid/auth", "@cubid/auth-react"],
  };
  const optionalValues: Array<[string, unknown]> = [
    ["contacts", getOptionalCsv("CLEARPASS_DASHBOARD_OIDC_CONTACTS")],
    ["logo_uri", getOptionalString("CLEARPASS_DASHBOARD_OIDC_LOGO_URI")],
    ["policy_uri", getOptionalString("CLEARPASS_DASHBOARD_OIDC_POLICY_URI")],
    ["tos_uri", getOptionalString("CLEARPASS_DASHBOARD_OIDC_TOS_URI")],
  ];

  for (const [key, value] of optionalValues) {
    if (value !== undefined) {
      metadata[key] = value;
    }
  }

  return metadata;
}

async function insertAuditEvent(
  supabase: ReturnType<typeof getOidcSupabase>,
  input: {
    actorIdentifier: string;
    clientId: string;
    details: Record<string, unknown>;
    eventType: string;
    requestId: string;
  },
): Promise<void> {
  const { error } = await supabase.from("oidc_audit_logs").insert({
    actor_identifier: input.actorIdentifier,
    actor_type: "internal",
    client_id: input.clientId,
    details: input.details,
    event_type: input.eventType,
    log_id: `audit_${randomBytes(24).toString("hex")}`,
    outcome: "success",
    request_id: input.requestId,
  });

  if (error) {
    throw new Error(`Failed to insert ClearPass Dashboard OIDC audit log: ${error.message}`);
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const issuer = getSeedIssuer();
  const clientId = process.env.CLEARPASS_DASHBOARD_OIDC_CLIENT_ID?.trim() || "clearpass-dashboard";
  const clientName = process.env.CLEARPASS_DASHBOARD_OIDC_CLIENT_NAME?.trim() || "ClearPass Dashboard";
  const redirectUris = normalizeRedirectUris(
    "public_web",
    splitCsv(getRequiredEnv("CLEARPASS_DASHBOARD_OIDC_REDIRECT_URIS")),
  );
  const postLogoutRedirectUris = normalizePostLogoutRedirectUris(
    "public_web",
    splitCsv(getRequiredEnv("CLEARPASS_DASHBOARD_OIDC_POST_LOGOUT_REDIRECT_URIS")),
  );
  const metadata = buildMetadata();
  const requestedStatus = getOptionalEnum("CLEARPASS_DASHBOARD_OIDC_STATUS", CLIENT_STATUSES);
  const requestedRateLimitTier = getOptionalEnum("CLEARPASS_DASHBOARD_OIDC_RATE_LIMIT_TIER", RATE_LIMIT_TIERS);

  const safePayload = {
    client_id: clientId,
    client_name: clientName,
    client_type: "public_web",
    default_scopes: ["openid", "email", "profile"],
    grant_types: ["authorization_code"],
    issuer,
    post_logout_redirect_uris: postLogoutRedirectUris,
    redirect_uris: redirectUris,
    token_endpoint_auth_method: "none",
  };

  if (dryRun) {
    console.log(JSON.stringify({ operation: "dry-run", ...safePayload }, null, 2));
    return;
  }

  const config = getOidcRuntimeConfig();
  const supabase = getOidcSupabase();
  const now = new Date().toISOString();
  const requestId = `seed_clearpass_${randomBytes(12).toString("hex")}`;
  const { data: existing, error: lookupError } = await supabase
    .from("oidc_clients")
    .select("client_id,metadata,rate_limit_tier,status")
    .eq("client_id", clientId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Failed to look up ClearPass Dashboard OIDC client: ${lookupError.message}`);
  }

  if (existing) {
    const { error } = await supabase
      .from("oidc_clients")
      .update({
        allowed_scopes: ["openid", "email", "profile"],
        client_name: clientName,
        client_type: "public_web",
        default_scopes: ["openid", "email", "profile"],
        grant_types: ["authorization_code"],
        metadata: {
          ...(existing.metadata ?? {}),
          ...metadata,
        },
        post_logout_redirect_uris: postLogoutRedirectUris,
        rate_limit_tier: requestedRateLimitTier ?? existing.rate_limit_tier ?? "starter",
        redirect_uris: redirectUris,
        status: requestedStatus ?? existing.status ?? "active",
        token_endpoint_auth_method: "none",
        updated_at: now,
      })
      .eq("client_id", clientId);

    if (error) {
      throw new Error(`Failed to update ClearPass Dashboard OIDC client: ${error.message}`);
    }

    await insertAuditEvent(supabase, {
      actorIdentifier: "@cubid/oidc seed:clearpass-dashboard",
      clientId,
      eventType: "client.seeded",
      requestId,
      details: {
        client_type: "public_web",
        operation: "updated",
        post_logout_redirect_uri_count: postLogoutRedirectUris.length,
        rate_limit_tier_changed: requestedRateLimitTier !== undefined,
        redirect_uri_count: redirectUris.length,
        status_changed: requestedStatus !== undefined,
      },
    });

    console.log(JSON.stringify({ operation: "updated", ...safePayload }, null, 2));
    return;
  }

  const registrationAccessToken = `reg_${randomBytes(24).toString("hex")}`;
  const { error } = await supabase.from("oidc_clients").insert({
    allowed_scopes: ["openid", "email", "profile"],
    client_id: clientId,
    client_name: clientName,
    client_secret_hash: null,
    client_type: "public_web",
    default_scopes: ["openid", "email", "profile"],
    grant_types: ["authorization_code"],
    metadata,
    owner_account_id: null,
    post_logout_redirect_uris: postLogoutRedirectUris,
    rate_limit_tier: requestedRateLimitTier ?? "starter",
    redirect_uris: redirectUris,
    registration_access_token_hash: hashOidcSecret(registrationAccessToken),
    registration_client_uri: `${config.publicOrigin}/register/${clientId}`,
    secret_version: null,
    status: requestedStatus ?? "active",
    token_endpoint_auth_method: "none",
    verification_status: "internal",
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw new Error(`Failed to create ClearPass Dashboard OIDC client: ${error.message}`);
  }

  await insertAuditEvent(supabase, {
    actorIdentifier: "@cubid/oidc seed:clearpass-dashboard",
    clientId,
    eventType: "client.seeded",
    requestId,
    details: {
      client_type: "public_web",
      operation: "created",
      post_logout_redirect_uri_count: postLogoutRedirectUris.length,
      rate_limit_tier: requestedRateLimitTier ?? "starter",
      redirect_uri_count: redirectUris.length,
      status: requestedStatus ?? "active",
    },
  });

  console.log(JSON.stringify({ operation: "created", ...safePayload }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
