import { describe, expect, it } from "vitest";
import {
  finishScanRun,
  insertNameCheck,
  insertScanRun,
  openScanDatabase,
  queryLatestAvailable,
  queryLatestNameChecks,
} from "../src/database.js";

describe("database", () => {
  it("creates schema and inserts scan results", () => {
    const db = openScanDatabase(":memory:");

    try {
      const runId = insertScanRun(db, {
        startedAt: "2026-07-12T00:00:00.000Z",
        durationSeconds: 31_536_000,
        inputCount: 1,
      });

      insertNameCheck(db, {
        scanRunId: runId,
        originalInput: "foo",
        normalizedLabel: "foo",
        fullName: "foo.eth",
        status: "available",
        expiryTimestamp: 0,
        graceEndTimestamp: 7_776_000,
        baseWei: "100",
        premiumWei: "0",
        totalWei: "100",
        checkedBlock: "123",
        errorMessage: null,
      });
      finishScanRun(db, runId, "2026-07-12T00:00:01.000Z", 1, 0);

      const run = db.prepare("SELECT * FROM scan_runs WHERE id = ?").get(runId);
      const rows = queryLatestAvailable(db, 10);

      expect(run).toMatchObject({
        scanned_count: 1,
        error_count: 0,
      });
      expect(rows).toEqual([
        expect.objectContaining({
          full_name: "foo.eth",
          status: "available",
          total_wei: "100",
        }),
      ]);
    } finally {
      db.close();
    }
  });

  it("can query latest rows for every status", () => {
    const db = openScanDatabase(":memory:");

    try {
      const runId = insertScanRun(db, {
        startedAt: "2026-07-12T00:00:00.000Z",
        durationSeconds: 31_536_000,
        inputCount: 2,
      });

      insertNameCheck(db, {
        scanRunId: runId,
        originalInput: "registered",
        normalizedLabel: "registered",
        fullName: "registered.eth",
        status: "registered",
        expiryTimestamp: 1_900_000_000,
        graceEndTimestamp: 1_907_776_000,
        baseWei: "100",
        premiumWei: "0",
        totalWei: "100",
        checkedBlock: "123",
        errorMessage: null,
      });
      insertNameCheck(db, {
        scanRunId: runId,
        originalInput: "available",
        normalizedLabel: "available",
        fullName: "available.eth",
        status: "available",
        expiryTimestamp: 0,
        graceEndTimestamp: 7_776_000,
        baseWei: "100",
        premiumWei: "0",
        totalWei: "100",
        checkedBlock: "123",
        errorMessage: null,
      });

      expect(queryLatestNameChecks(db, { limit: 10, includeAll: true })).toEqual([
        expect.objectContaining({ full_name: "available.eth", status: "available" }),
        expect.objectContaining({ full_name: "registered.eth", status: "registered" }),
      ]);
    } finally {
      db.close();
    }
  });
});
