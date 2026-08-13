export const BASE_REGISTRAR_ADDRESS =
  "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85" as const;
export const CONTROLLER_ADDRESS =
  "0x59E16fcCd424Cc24e280Be16E11Bcd56fb0CE547" as const;

export const CHAIN_NAME = "mainnet";
export const DEFAULT_DB_PATH = "data/ens-scans.sqlite";
export const DEFAULT_DURATION_DAYS = 365;
export const DEFAULT_NAMES_FILE = "names.txt";
export const GRACE_PERIOD_SECONDS = 90 * 24 * 60 * 60;
export const SECONDS_PER_DAY = 24 * 60 * 60;

export const NAME_STATUSES = [
  "invalid",
  "registered",
  "grace_period",
  "temp_premium",
  "available",
  "error",
] as const;

export type NameStatus = (typeof NAME_STATUSES)[number];
