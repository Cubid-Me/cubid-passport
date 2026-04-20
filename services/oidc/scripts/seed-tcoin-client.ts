import { createDynamicClientRegistration } from "../src/registration";
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

async function findExistingClient(clientName: string) {
  const { data, error } = await getOidcSupabase()
    .from("oidc_clients")
    .select("*")
    .eq("client_name", clientName)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to look up TCOIN OIDC client: ${error.message}`);
  }

  return data as { client_id: string; metadata: Record<string, unknown> } | null;
}

async function main() {
  const clientName = process.env.TCOIN_OIDC_CLIENT_NAME?.trim() || "TCOIN";
  const redirectUris = splitCsv(getRequiredEnv("TCOIN_OIDC_REDIRECT_URIS"));
  const postLogoutRedirectUris = splitCsv(process.env.TCOIN_OIDC_POST_LOGOUT_REDIRECT_URIS ?? "");
  const existing = await findExistingClient(clientName);

  if (existing) {
    const { error } = await getOidcSupabase()
      .from("oidc_clients")
      .update({
        client_type: "public_web",
        status: "active",
        token_endpoint_auth_method: "none",
        redirect_uris: redirectUris,
        post_logout_redirect_uris: postLogoutRedirectUris,
        grant_types: ["authorization_code"],
        default_scopes: ["openid", "email", "profile"],
        allowed_scopes: ["openid", "email", "profile"],
        rate_limit_tier: "starter",
        metadata: {
          ...(existing.metadata ?? {}),
          integration: "tcoin",
          seeded_by: "@cubid/oidc seed:tcoin",
        },
        updated_at: new Date().toISOString(),
      })
      .eq("client_id", existing.client_id);

    if (error) {
      throw new Error(`Failed to update TCOIN OIDC client: ${error.message}`);
    }

    console.log(JSON.stringify({ status: "updated", client_id: existing.client_id }, null, 2));
    return;
  }

  const created = await createDynamicClientRegistration(
    getOidcSupabase(),
    {
      client_name: clientName,
      client_type: "public_web",
      redirect_uris: redirectUris,
      post_logout_redirect_uris: postLogoutRedirectUris,
      grant_types: ["authorization_code"],
      default_scopes: ["openid", "email", "profile"],
      allowed_scopes: ["openid", "email", "profile"],
      token_endpoint_auth_method: "none",
      contacts: splitCsv(process.env.TCOIN_OIDC_CONTACTS ?? ""),
      policy_uri: process.env.TCOIN_OIDC_POLICY_URI,
      tos_uri: process.env.TCOIN_OIDC_TOS_URI,
      logo_uri: process.env.TCOIN_OIDC_LOGO_URI,
    },
    `seed-tcoin-${Date.now()}`,
  );

  console.log(JSON.stringify({ operation: "created", ...created }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
