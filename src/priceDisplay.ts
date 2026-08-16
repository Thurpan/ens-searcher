import { formatEther } from "viem";

export interface EthUsdPrice {
  usd: number;
  source: string;
}

export async function resolveEthUsdPrice(input: {
  cliPrice: number | null;
  env: NodeJS.ProcessEnv;
}): Promise<EthUsdPrice | null> {
  if (input.cliPrice !== null) {
    return { usd: input.cliPrice, source: "--eth-usd" };
  }

  const envPrice = parseOptionalPrice(input.env.ETH_USD_PRICE);
  if (envPrice !== null) {
    return { usd: envPrice, source: "ETH_USD_PRICE" };
  }

  return fetchCoinGeckoEthUsd();
}

export function weiToEth4(wei: string | null): string {
  if (wei === null) {
    return "";
  }

  return Number(formatEther(BigInt(wei))).toFixed(4);
}

export function weiToUsd(wei: string | null, ethUsdPrice: EthUsdPrice | null): string {
  if (wei === null || ethUsdPrice === null) {
    return "";
  }

  const eth = Number(formatEther(BigInt(wei)));
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(eth * ethUsdPrice.usd);
}

async function fetchCoinGeckoEthUsd(): Promise<EthUsdPrice | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      {
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      return null;
    }

    const body: unknown = await response.json();

    if (!(body instanceof Object) || !("ethereum" in body)) {
      return null;
    }

    const ethereum = body.ethereum;
    if (!(ethereum instanceof Object) || !("usd" in ethereum)) {
      return null;
    }

    const usdValue = ethereum.usd;
    if (Object.prototype.toString.call(usdValue) !== "[object Number]") {
      return null;
    }

    const usd = Number(usdValue);

    if (!Number.isFinite(usd) || usd <= 0) {
      return null;
    }

    return { usd, source: "CoinGecko" };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function parseOptionalPrice(value: string | undefined): number | null {
  if (value === undefined || value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}
