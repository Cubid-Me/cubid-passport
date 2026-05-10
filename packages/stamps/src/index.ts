export const STAMP_TYPE_IDS = {
  facebook: 1,
  github: 2,
  google: 3,
  twitter: 4,
  discord: 5,
  poh: 6,
  iah: 7,
  brightid: 8,
  gitcoin: 9,
  instagram: 10,
  phone: 11,
  gooddollar: 12,
  email: 13,
  evm: 14,
  near: 15,
  "near-wallet": 15,
  fractal: 17,
  linkedin: 22,
  worldcoin: 26,
  telegram: 27,
  solana: 53,
  "lens-protocol": 66,
  farcaster: 68,
  address: 70,
  clearpass_verify: 71,
} as const;

export type StampTypeKey = keyof typeof STAMP_TYPE_IDS;

export interface StampPermissionDescriptor {
  dappUserId: string;
  stampId: number;
}

export interface StampRecordShape {
  id?: number | string | null;
  identity?: unknown;
  is_valid?: unknown;
  stamptype?: unknown;
  uniquevalue?: unknown;
}

export interface DisclosedStampSummary {
  stampType: string;
  stampTypeId: number;
  status: "Verified" | "Unverified";
  value: string | null;
}

const STAMP_TYPE_NAMES_BY_ID = Object.entries(STAMP_TYPE_IDS).reduce<Record<number, StampTypeKey>>(
  (accumulator, [stampType, stampTypeId]) => {
    if (accumulator[stampTypeId] === undefined || stampType !== "near-wallet") {
      accumulator[stampTypeId] = stampType as StampTypeKey;
    }
    return accumulator;
  },
  {},
);

export function getStampTypeId(stampType: string): number | null {
  const normalized = stampType.trim() as StampTypeKey;
  return STAMP_TYPE_IDS[normalized] ?? null;
}

export function getStampTypeName(stampTypeId: number): string {
  return STAMP_TYPE_NAMES_BY_ID[stampTypeId] ?? String(stampTypeId);
}

export function getStampTypeNamesById(): Record<number, string> {
  return { ...STAMP_TYPE_NAMES_BY_ID };
}

export function createStampPermissionDescriptor(input: StampPermissionDescriptor): StampPermissionDescriptor {
  if (!input.dappUserId.trim()) {
    throw new Error("dappUserId is required.");
  }
  if (!Number.isInteger(input.stampId) || input.stampId <= 0) {
    throw new Error("stampId must be a positive integer.");
  }

  return {
    dappUserId: input.dappUserId,
    stampId: input.stampId,
  };
}

export function normalizeDisclosedStamp(record: StampRecordShape): DisclosedStampSummary {
  const stampTypeId = Number(record.stamptype);
  if (!Number.isInteger(stampTypeId) || stampTypeId <= 0) {
    throw new Error("Stamp record is missing a valid stamptype.");
  }

  const value = typeof record.identity === "string"
    ? record.identity
    : typeof record.uniquevalue === "string"
      ? record.uniquevalue
      : null;

  return {
    stampType: getStampTypeName(stampTypeId),
    stampTypeId,
    status: record.is_valid ? "Verified" : "Unverified",
    value,
  };
}

export const stampsWithId = STAMP_TYPE_IDS;
