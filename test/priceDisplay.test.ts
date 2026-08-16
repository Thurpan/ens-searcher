import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveEthUsdPrice, weiToEth4, weiToUsd } from "../src/priceDisplay.js";

describe("price display", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("uses CoinGecko keyless public API without auth headers", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ ethereum: { usd: 1803.45 } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      resolveEthUsdPrice({
        cliPrice: null,
        env: {},
      }),
    ).resolves.toEqual({ usd: 1803.45, source: "CoinGecko" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestInit = fetchMock.mock.calls[0]?.[1];
    if (requestInit === undefined) {
      throw new Error("Expected fetch request init");
    }

    expect("headers" in requestInit).toBe(false);
  });

  it("rejects an untyped CoinGecko USD value", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () =>
        new Response(JSON.stringify({ ethereum: { usd: "1803.45" } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(
      resolveEthUsdPrice({
        cliPrice: null,
        env: {},
      }),
    ).resolves.toBeNull();
  });
});
