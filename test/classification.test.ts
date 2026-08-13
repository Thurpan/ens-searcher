import { describe, expect, it } from "vitest";
import { GRACE_PERIOD_SECONDS } from "../src/constants.js";
import { classifyLifecycle } from "../src/classification.js";

describe("classifyLifecycle", () => {
  const nowSeconds = 1_700_000_000;

  it("classifies future expiries as registered", () => {
    expect(
      classifyLifecycle(
        {
          available: false,
          expiryTimestamp: BigInt(nowSeconds + 100),
          premiumWei: 0n,
        },
        nowSeconds,
      ).status,
    ).toBe("registered");
  });

  it("classifies expired names inside grace period", () => {
    expect(
      classifyLifecycle(
        {
          available: false,
          expiryTimestamp: BigInt(nowSeconds - 100),
          premiumWei: 0n,
        },
        nowSeconds,
      ),
    ).toMatchObject({
      status: "grace_period",
      graceEndTimestamp: nowSeconds - 100 + GRACE_PERIOD_SECONDS,
    });
  });

  it("classifies available names with premium", () => {
    expect(
      classifyLifecycle(
        {
          available: true,
          expiryTimestamp: 0n,
          premiumWei: 1n,
        },
        nowSeconds,
      ).status,
    ).toBe("temp_premium");
  });

  it("classifies available names without premium", () => {
    expect(
      classifyLifecycle(
        {
          available: true,
          expiryTimestamp: 0n,
          premiumWei: 0n,
        },
        nowSeconds,
      ).status,
    ).toBe("available");
  });
});
