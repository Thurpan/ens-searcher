import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { LatestNameCheckRow } from "../src/database.js";
import {
  applyQueryRankOrder,
  loadQueryRankFile,
  parseQueryRankFile,
} from "../src/queryRank.js";

describe("query rank ordering", () => {
  it("orders ranked available names before cheaper unranked names", () => {
    const rankFile = parseQueryRankFile("common\n");
    const rows = [row("cheap"), row("common")];

    expect(
      applyQueryRankOrder(rows, rankFile.ranksByLabel, 100).map(
        (result) => result.normalized_label,
      ),
    ).toEqual(["common", "cheap"]);
  });

  it("keeps the first rank for duplicate rank-file entries", () => {
    const rankFile = parseQueryRankFile(`
      beta
      alpha
      beta.eth
    `);
    const rows = [row("alpha"), row("beta")];

    expect(
      applyQueryRankOrder(rows, rankFile.ranksByLabel, 100).map(
        (result) => result.normalized_label,
      ),
    ).toEqual(["beta", "alpha"]);
  });

  it("uses input parser behavior for comments, blanks, and .eth suffixes", () => {
    const rankFile = parseQueryRankFile(`
      # ignored
      Foo.eth # inline comment

      bar
    `);
    const rows = [row("bar"), row("foo")];

    expect([...rankFile.ranksByLabel]).toEqual([
      ["foo", 0],
      ["bar", 1],
    ]);
    expect(
      applyQueryRankOrder(rows, rankFile.ranksByLabel, 100).map(
        (result) => result.normalized_label,
      ),
    ).toEqual(["foo", "bar"]);
  });

  it("applies limits after rank sorting", () => {
    const rankFile = parseQueryRankFile(`
      alpha
      beta
    `);
    const rows = [row("cheap"), row("beta"), row("alpha")];

    expect(
      applyQueryRankOrder(rows, rankFile.ranksByLabel, 1).map(
        (result) => result.normalized_label,
      ),
    ).toEqual(["alpha"]);
  });

  it("counts invalid rank-file lines", () => {
    const rankFile = parseQueryRankFile(`
      okname
      ab
      bad\u0000name
    `);

    expect(rankFile.invalidLineCount).toBe(2);
    expect([...rankFile.ranksByLabel]).toEqual([["okname", 0]]);
  });

  it("throws a clear error for missing rank files", () => {
    const missingFile = join(
      tmpdir(),
      `ens-searcher-missing-rank-file-${process.pid}-${Date.now()}.txt`,
    );

    expect(() => loadQueryRankFile(missingFile)).toThrow(
      `Rank file not found: ${missingFile}`,
    );
  });

  it("throws a clear error when a rank file has no valid labels", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ens-searcher-rank-file-"));
    const rankFilePath = join(tempDir, "rank.txt");

    try {
      writeFileSync(rankFilePath, "ab\nbad\u0000name\n", "utf8");

      expect(() => loadQueryRankFile(rankFilePath)).toThrow(
        `No valid rankable labels found in rank file: ${rankFilePath}`,
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

function row(normalizedLabel: string): LatestNameCheckRow {
  return {
    scan_run_id: 1,
    original_input: normalizedLabel,
    normalized_label: normalizedLabel,
    full_name: `${normalizedLabel}.eth`,
    status: "available",
    base_wei: "100",
    premium_wei: "0",
    total_wei: "100",
    checked_block: "123",
  };
}
