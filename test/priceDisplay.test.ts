import { describe, expect, it } from "vitest";
import { resolveEthUsdPrice, weiToEth4, weiToUsd } from "../src/priceDisplay.js";

describe("price display", () => {
  it("formats wei values as 4dp ETH", () => {
    expect(weiToEth4("2782178864237097")).toBe("0.0028");
    expect(weiToEth4("18328466144378275485")).toBe("18.3285");
  });

  it("formats wei values as USD", () => {
    expect(weiToUsd("1000000000000000000", { usd: 3500, source: "test" })).toBe(
      "$3,500.00",
    );
  });

  it("prefers CLI price over environment price", async () => {
    await expect(
      resolveEthUsdPrice({
        cliPrice: 1234.5,
        env: { ETH_USD_PRICE: "3500" },
      }),
    ).resolves.toEqual({ usd: 1234.5, source: "--eth-usd" });
  });

  it("uses ETH_USD_PRICE when no CLI price is provided", async () => {
    await expect(
      resolveEthUsdPrice({
        cliPrice: null,
        env: { ETH_USD_PRICE: "3500.25" },
      }),
    ).resolves.toEqual({ usd: 3500.25, source: "ETH_USD_PRICE" });
  });
});
