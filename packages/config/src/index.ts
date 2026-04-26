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
