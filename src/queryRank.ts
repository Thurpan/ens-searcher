import { existsSync, readFileSync } from "node:fs";
import { normalizeCandidate, parseNamesFile } from "./input.js";
import type { LatestNameCheckRow } from "./database.js";

export interface QueryRankFile {
  ranksByLabel: Map<string, number>;
  invalidLineCount: number;
}

export function loadQueryRankFile(filePath: string): QueryRankFile {
  if (!existsSync(filePath)) {
    throw new Error(`Rank file not found: ${filePath}`);
  }

  const rankFile = parseQueryRankFile(readFileSync(filePath, "utf8"));

  if (rankFile.ranksByLabel.size === 0) {
    throw new Error(`No valid rankable labels found in rank file: ${filePath}`);
  }

  return rankFile;
}

export function parseQueryRankFile(content: string): QueryRankFile {
  const ranksByLabel = new Map<string, number>();
  let invalidLineCount = 0;

  for (const candidate of parseNamesFile(content)) {
    const normalized = normalizeCandidate(candidate.originalInput);

    if (normalized.kind === "invalid") {
      invalidLineCount += 1;
      continue;
    }

    if (!ranksByLabel.has(normalized.normalizedLabel)) {
      ranksByLabel.set(normalized.normalizedLabel, ranksByLabel.size);
    }
  }

  return {
    ranksByLabel,
    invalidLineCount,
  };
}

export function applyQueryRankOrder(
  rows: LatestNameCheckRow[],
  ranksByLabel: Map<string, number>,
  limit: number,
): LatestNameCheckRow[] {
  return [...rows]
    .sort((left, right) => {
      const leftRank = ranksByLabel.get(left.normalized_label);
      const rightRank = ranksByLabel.get(right.normalized_label);

      if (leftRank !== undefined && rightRank !== undefined) {
        return leftRank - rightRank;
      }

      if (leftRank !== undefined) {
        return -1;
      }

      if (rightRank !== undefined) {
        return 1;
      }

      return 0;
    })
    .slice(0, limit);
}
