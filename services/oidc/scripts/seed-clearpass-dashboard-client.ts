import { randomBytes } from "node:crypto";

import { getOidcRuntimeConfig } from "../src/config";
import { hashOidcSecret } from "../src/registration";
import { getOidcSupabase } from "../src/supabase";

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

function getOptionalCsv(name: string): string[] {
  return splitCsv(process.env[name] ?? "");
}

function getOptionalString(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function validateHttpsOrLocalhostUris(name: string, values: string[]): void {
  if (values.length === 0) {
    throw new Error(`${name} must include at least one URI.`);
  }

  for (const value of values) {
    const url = new URL(value);
    const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    if (url.protocol !== "https:" && !isLocalhost) {
      throw new Error(`${name} entries must use HTTPS or localhost: ${value}`);
    }
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const config = getOidcRuntimeConfig();
  const clientId = process.env.CLEARPASS_DASHBOARD_OIDC_CLIENT_ID?.trim() || "clearpass-dashboard";
  const clientName = process.env.CLEARPASS_DASHBOARD_OIDC_CLIENT_NAME?.trim() || "ClearPass Dashboard";
  const redirectUris = splitCsv(getRequiredEnv("CLEARPASS_DASHBOARD_OIDC_REDIRECT_URIS"));
  const postLogoutRedirectUris = splitCsv(getRequiredEnv("CLEARPASS_DASHBOARD_OIDC_POST_LOGOUT_REDIRECT_URIS"));
  const contacts = getOptionalCsv("CLEARPASS_DASHBOARD_OIDC_CONTACTS");
  const metadata = {
    contacts,
    integration: "clearpass_dashboard",
    logo_uri: getOptionalString("CLEARPASS_DASHBOARD_OIDC_LOGO_URI"),
    policy_uri: getOptionalString("CLEARPASS_DASHBOARD_OIDC_POLICY_URI"),
    seeded_by: "@cubid/oidc seed:clearpass-dashboard",
    sdk_packages: ["@cubid/auth", "@cubid/auth-react"],
    tos_uri: getOptionalString("CLEARPASS_DASHBOARD_OIDC_TOS_URI"),
  };

  validateHttpsOrLocalhostUris("CLEARPASS_DASHBOARD_OIDC_REDIRECT_URIS", redirectUris);
  validateHttpsOrLocalhostUris("CLEARPASS_DASHBOARD_OIDC_POST_LOGOUT_REDIRECT_URIS", postLogoutRedirectUris);

  const safePayload = {
    client_id: clientId,
    client_name: clientName,
    client_type: "public_web",
    default_scopes: ["openid", "email", "profile"],
    grant_types: ["authorization_code"],
    issuer: config.issuer,
    post_logout_redirect_uris: postLogoutRedirectUris,
    redirect_uris: redirectUris,
    token_endpoint_auth_method: "none",
  };

  if (dryRun) {
    console.log(JSON.stringify({ operation: "dry-run", ...safePayload }, null, 2));
    return;
  }

  const supabase = getOidcSupabase();
  const now = new Date().toISOString();
  const { data: existing, error: lookupError } = await supabase
    .from("oidc_clients")
    .select("client_id,metadata")
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
        rate_limit_tier: "starter",
        redirect_uris: redirectUris,
        status: "active",
        token_endpoint_auth_method: "none",
        updated_at: now,
      })
      .eq("client_id", clientId);

    if (error) {
      throw new Error(`Failed to update ClearPass Dashboard OIDC client: ${error.message}`);
    }

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
    rate_limit_tier: "starter",
    redirect_uris: redirectUris,
    registration_access_token_hash: hashOidcSecret(registrationAccessToken),
    registration_client_uri: `${config.publicOrigin}/register/${clientId}`,
    secret_version: null,
    status: "active",
    token_endpoint_auth_method: "none",
    verification_status: "internal",
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw new Error(`Failed to create ClearPass Dashboard OIDC client: ${error.message}`);
  }

  console.log(JSON.stringify({ operation: "created", ...safePayload }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
