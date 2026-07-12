import { GRACE_PERIOD_SECONDS, type NameStatus } from "./constants.js";

export interface LifecycleInput {
  available: boolean;
  expiryTimestamp: bigint;
  premiumWei: bigint;
}

export interface Classification {
  status: NameStatus;
  expiryTimestamp: number;
  graceEndTimestamp: number;
  errorMessage: string | null;
}

export function classifyLifecycle(
  input: LifecycleInput,
  nowSeconds: number,
): Classification {
  const expiryTimestamp = Number(input.expiryTimestamp);
  const graceEndTimestamp = expiryTimestamp + GRACE_PERIOD_SECONDS;

  if (expiryTimestamp > nowSeconds) {
    return {
      status: "registered",
      expiryTimestamp,
      graceEndTimestamp,
      errorMessage: null,
    };
  }

  if (expiryTimestamp > 0 && nowSeconds <= graceEndTimestamp) {
    return {
      status: "grace_period",
      expiryTimestamp,
      graceEndTimestamp,
      errorMessage: null,
    };
  }

  if (input.available && input.premiumWei > 0n) {
    return {
      status: "temp_premium",
      expiryTimestamp,
      graceEndTimestamp,
      errorMessage: null,
    };
  }

  if (input.available && input.premiumWei === 0n) {
    return {
      status: "available",
      expiryTimestamp,
      graceEndTimestamp,
      errorMessage: null,
    };
  }

  return {
    status: "error",
    expiryTimestamp,
    graceEndTimestamp,
    errorMessage: "Controller returned unavailable outside registration or grace period",
  };
}
