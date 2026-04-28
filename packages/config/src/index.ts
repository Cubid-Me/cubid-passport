export const getRequiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const getOptionalEnv = (name: string): string | null => {
  const value = process.env[name]?.trim();
  return value ? value : null;
};

export const getRequiredNumericEnv = (name: string): number => {
  const value = getRequiredEnv(name);
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }

  return parsedValue;
};

export const getOptionalNumericEnv = (name: string): number | null => {
  const value = getOptionalEnv(name);

  if (value === null) {
    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }

  return parsedValue;
};

export const parseCsvValue = (rawValue: string | null | undefined): string[] => {
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

export const getCsvEnv = (name: string): string[] => {
  return parseCsvValue(getOptionalEnv(name));
};

export type EnvSource = Record<string, string | undefined>;

export type SecretStrengthOptions = {
  minLength?: number;
};

export const redactSecret = (value: string | null | undefined): string => {
  if (!value) {
    return "[missing]";
  }

  const trimmed = value.trim();

  if (trimmed.length <= 8) {
    return "[redacted]";
  }

  return `${trimmed.slice(0, 4)}...[redacted]...${trimmed.slice(-4)}`;
};

export const getOptionalEnvFrom = (
  env: EnvSource,
  name: string
): string | null => {
  const value = env[name]?.trim();
  return value ? value : null;
};

export const getRequiredSecretFrom = (
  env: EnvSource,
  name: string,
  options: SecretStrengthOptions = {}
): string => {
  const value = getOptionalEnvFrom(env, name);

  if (!value) {
    throw new Error(`Missing required secret: ${name}`);
  }

  if (options.minLength && value.length < options.minLength) {
    throw new Error(
      `Secret ${name} must be at least ${options.minLength} characters`
    );
  }

  return value;
};

export const getRequiredSecret = (
  name: string,
  options: SecretStrengthOptions = {}
): string => getRequiredSecretFrom(process.env, name, options);

export const getOptionalSecretFromAliases = (
  env: EnvSource,
  names: readonly string[]
): string | null => {
  for (const name of names) {
    const value = getOptionalEnvFrom(env, name);

    if (value) {
      return value;
    }
  }

  return null;
};

export const getRequiredSecretFromAliases = (
  env: EnvSource,
  names: readonly string[],
  options: SecretStrengthOptions = {}
): string => {
  const value = getOptionalSecretFromAliases(env, names);

  if (!value) {
    throw new Error(`Missing required secret: ${names.join(" or ")}`);
  }

  if (options.minLength && value.length < options.minLength) {
    throw new Error(
      `Secret ${names[0]} must be at least ${options.minLength} characters`
    );
  }

  return value;
};

export const getRequiredSecretFromEnvAliases = (
  names: readonly string[],
  options: SecretStrengthOptions = {}
): string => getRequiredSecretFromAliases(process.env, names, options);

export const parseJsonSecretObject = (
  rawValue: string | null | undefined,
  name: string
): Record<string, unknown> | null => {
  if (!rawValue?.trim()) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawValue);
  } catch {
    throw new Error(`Secret ${name} must be valid JSON`);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Secret ${name} must be a JSON object`);
  }

  return parsed as Record<string, unknown>;
};

export const getRequiredJsonSecretObjectFrom = (
  env: EnvSource,
  name: string
): Record<string, unknown> => {
  const value = getRequiredSecretFrom(env, name);
  const parsed = parseJsonSecretObject(value, name);

  if (!parsed) {
    throw new Error(`Missing required secret: ${name}`);
  }

  return parsed;
};

export const normalizeFirebasePrivateKey = (value: string): string =>
  value.replace(/\\n/g, "\n");

export const getFirebaseAdminCredentialsFrom = (
  env: EnvSource,
  options: {
    clientEmailName?: string;
    privateKeyName?: string;
    projectIdName?: string;
  } = {}
) => {
  const projectIdName = options.projectIdName ?? "FIREBASE_PROJECT_ID";
  const clientEmailName = options.clientEmailName ?? "FIREBASE_CLIENT_EMAIL";
  const privateKeyName = options.privateKeyName ?? "FIREBASE_PRIVATE_KEY";

  return {
    clientEmail: getRequiredSecretFrom(env, clientEmailName),
    privateKey: normalizeFirebasePrivateKey(
      getRequiredSecretFrom(env, privateKeyName)
    ),
    projectId: getRequiredSecretFrom(env, projectIdName),
  };
};

export const getFirebaseAdminCredentials = (
  options: {
    clientEmailName?: string;
    privateKeyName?: string;
    projectIdName?: string;
  } = {}
) => getFirebaseAdminCredentialsFrom(process.env, options);

export const getSupabaseServiceRoleConfigFrom = (env: EnvSource) => ({
  serviceRoleKey: getRequiredSecretFrom(env, "SUPABASE_SERVICE_ROLE_KEY", {
    minLength: 12,
  }),
  url: getRequiredSecretFrom(env, "SUPABASE_URL"),
});

export const getSupabaseServiceRoleConfig = () =>
  getSupabaseServiceRoleConfigFrom(process.env);
