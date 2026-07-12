import {
  createPublicClient,
  hexToBigInt,
  http,
  keccak256,
  toBytes,
} from "viem";
import { mainnet } from "viem/chains";
import {
  BASE_REGISTRAR_ADDRESS,
  CONTROLLER_ADDRESS,
} from "./constants.js";
import { baseRegistrarAbi, controllerAbi } from "./contracts.js";

export interface EnsCheck {
  valid: boolean;
  available: boolean | null;
  expiryTimestamp: bigint | null;
  baseWei: bigint | null;
  premiumWei: bigint | null;
  checkedBlock: bigint;
}

export interface EnsClient {
  checkName(label: string, durationSeconds: number): Promise<EnsCheck>;
}

type PriceResult =
  | { base: bigint; premium: bigint }
  | readonly [base: bigint, premium: bigint];

export function createViemEnsClient(rpcUrl: string): EnsClient {
  const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(rpcUrl),
  });

  return {
    async checkName(label: string, durationSeconds: number): Promise<EnsCheck> {
      const checkedBlock = await publicClient.getBlockNumber();
      const valid = await publicClient.readContract({
        address: CONTROLLER_ADDRESS,
        abi: controllerAbi,
        functionName: "valid",
        args: [label],
        blockNumber: checkedBlock,
      });

      if (!valid) {
        return {
          valid,
          available: null,
          expiryTimestamp: null,
          baseWei: null,
          premiumWei: null,
          checkedBlock,
        };
      }

      const tokenId = labelTokenId(label);
      const [available, rentPrice, expiryTimestamp] = await Promise.all([
        publicClient.readContract({
          address: CONTROLLER_ADDRESS,
          abi: controllerAbi,
          functionName: "available",
          args: [label],
          blockNumber: checkedBlock,
        }),
        publicClient.readContract({
          address: CONTROLLER_ADDRESS,
          abi: controllerAbi,
          functionName: "rentPrice",
          args: [label, BigInt(durationSeconds)],
          blockNumber: checkedBlock,
        }),
        publicClient.readContract({
          address: BASE_REGISTRAR_ADDRESS,
          abi: baseRegistrarAbi,
          functionName: "nameExpires",
          args: [tokenId],
          blockNumber: checkedBlock,
        }),
      ]);

      const price = unpackPrice(rentPrice as PriceResult);

      return {
        valid,
        available,
        expiryTimestamp,
        baseWei: price.base,
        premiumWei: price.premium,
        checkedBlock,
      };
    },
  };
}

function labelTokenId(label: string): bigint {
  return hexToBigInt(keccak256(toBytes(label)));
}

function unpackPrice(price: PriceResult): { base: bigint; premium: bigint } {
  if ("base" in price) {
    return price;
  }

  return {
    base: price[0],
    premium: price[1],
  };
}
