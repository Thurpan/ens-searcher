import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, vi } from "vitest";
import { openScanDatabase } from "../src/database.js";
import type { EnsClient } from "../src/ensClient.js";
import { runScan } from "../src/scanCore.js";

describe("runScan", () => {
  it("scans deduplicated names and persists successful results", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "ens-searcher-"));
    const filePath = join(tempDir, "names.txt");
    const dbPath = join(tempDir, "ens-scans.sqlite");
    await writeFile(filePath, "foo\nfoo.eth\n", "utf8");

    const client: EnsClient = {
      checkName: vi.fn(async () => ({
        valid: true,
        available: true,
        expiryTimestamp: 0n,
        baseWei: 100n,
        premiumWei: 0n,
        checkedBlock: 123n,
      })),
    };

    try {
      const summary = await runScan({
        filePath,
        dbPath,
        ensClient: client,
        nowSeconds: 1_700_000_000,
      });
      const db = openScanDatabase(dbPath);

      try {
        const rows = db.prepare("SELECT * FROM name_checks").all();

        expect(summary).toMatchObject({
          inputCount: 2,
          scannedCount: 1,
          errorCount: 0,
        });
        expect(client.checkName).toHaveBeenCalledTimes(1);
        expect(rows).toEqual([
          expect.objectContaining({
            normalized_label: "foo",
            full_name: "foo.eth",
            status: "available",
            total_wei: "100",
          }),
        ]);
      } finally {
        db.close();
      }
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("persists ENS client failures as error rows", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "ens-searcher-"));
    const filePath = join(tempDir, "names.txt");
    const dbPath = join(tempDir, "ens-scans.sqlite");
    await writeFile(filePath, "boom\n", "utf8");

    const client: EnsClient = {
      checkName: vi.fn(async () => {
        throw new Error("RPC failed");
      }),
    };

    try {
      const summary = await runScan({
        filePath,
        dbPath,
        ensClient: client,
        nowSeconds: 1_700_000_000,
      });
      const db = openScanDatabase(dbPath);

      try {
        const row = db.prepare("SELECT * FROM name_checks").get();

        expect(summary).toMatchObject({
          inputCount: 1,
          scannedCount: 1,
          errorCount: 1,
        });
        expect(row).toMatchObject({
          normalized_label: "boom",
          full_name: "boom.eth",
          status: "error",
          error_message: "RPC failed",
        });
      } finally {
        db.close();
      }
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("fails clearly when the names file is missing", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "ens-searcher-"));
    const filePath = join(tempDir, "missing.txt");

    try {
      await expect(
        runScan({
          filePath,
          dbPath: join(tempDir, "ens-scans.sqlite"),
          ensClient: {
            checkName: vi.fn(),
          },
        }),
      ).rejects.toThrow(`Names file not found: ${filePath}`);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
