#!/usr/bin/env node

const mode = process.argv.includes("--strict") ? "strict" : "local"

const specs = [
  {
    name: "OIDC issuer signing",
    requiredInStrict: ["OIDC_SIGNING_PRIVATE_JWK_JSON", "OIDC_ACTIVE_SIGNING_KID"],
    workspace: "services/oidc",
  },
  {
    minLength: 32,
    name: "OIDC pairwise subject secret",
    requiredInStrict: ["OIDC_PAIRWISE_SUBJECT_MASTER_SECRET"],
    workspace: "services/oidc",
  },
  {
    name: "Supabase service role",
    requiredInStrict: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    workspace: "apps/*, services/oidc",
  },
  {
    name: "Firebase Admin",
    requiredInStrict: [
      "FIREBASE_PROJECT_ID",
      "FIREBASE_CLIENT_EMAIL",
      "FIREBASE_PRIVATE_KEY",
    ],
    workspace: "apps/passport, apps/admin",
  },
  {
    aliases: [["TWILIO_ACCOUNT_SID", "twilio_sid"], ["TWILIO_AUTH_TOKEN", "authToken"]],
    name: "Twilio Verify",
    requiredInStrict: ["TWILIO_VERIFY_SERVICE_SID"],
    workspace: "apps/passport",
  },
  {
    name: "SMTP email OTP",
    requiredInStrict: ["SMTP_HOST", "SMTP_USERNAME", "SMTP_PASSWORD", "SMTP_FROM_EMAIL"],
    workspace: "apps/passport",
  },
  {
    aliases: [["NEAR_ISSUER_PRIVATE_KEY", "private_key_near"]],
    name: "NEAR issuer",
    requiredInStrict: [],
    workspace: "apps/passport",
  },
  {
    name: "OAuth providers",
    requiredInStrict: [
      "INSTAGRAM_CLIENT_SECRET",
      "FRACTAL_CLIENT_SECRET",
      "WLD_CLIENT_SECRET",
    ],
    workspace: "apps/passport",
  },
  {
    minLength: 16,
    name: "Passport internal bearer",
    requiredInStrict: ["PASSPORT_INTERNAL_API_TOKEN"],
    workspace: "apps/passport",
  },
]

const read = (name) => process.env[name]?.trim() ?? ""

let failures = 0

for (const spec of specs) {
  const checks = [...(spec.requiredInStrict ?? [])]
  const aliasChecks = spec.aliases ?? []
  const required = mode === "strict"

  for (const name of checks) {
    const value = read(name)
    const status = value ? "present" : required ? "missing" : "optional-missing"
    if (required && !value) failures += 1
    if (value && spec.minLength && value.length < spec.minLength) {
      failures += 1
      console.log(`${spec.workspace} ${spec.name} ${name}: weak`)
    } else {
      console.log(`${spec.workspace} ${spec.name} ${name}: ${status}`)
    }
  }

  for (const names of aliasChecks) {
    const found = names.find((name) => read(name))
    if (!found && required) failures += 1
    console.log(
      `${spec.workspace} ${spec.name} ${names.join(" | ")}: ${
        found ? `present (${found})` : required ? "missing" : "optional-missing"
      }`
    )
  }
}

if (failures > 0) {
  console.error(`Operational secret readiness failed with ${failures} issue(s).`)
  process.exitCode = 1
}
