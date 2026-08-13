import { formatEther } from "viem";

export interface EthUsdPrice {
  usd: number;
  source: string;
}

interface CoinGeckoSimplePriceResponse {
  ethereum?: {
    usd?: number;
  };
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

    const body = (await response.json()) as CoinGeckoSimplePriceResponse;
    const usd = body.ethereum?.usd;

    if (typeof usd !== "number" || !Number.isFinite(usd) || usd <= 0) {
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
