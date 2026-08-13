import { describe, expect, it } from "vitest";
import {
  finishScanRun,
  insertNameCheck,
  insertScanRun,
  openScanDatabase,
  queryLatestAvailable,
  queryLatestNameChecks,
  queryReusableNormalizedLabels,
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

  it("finds labels with reusable latest results", () => {
    const db = openScanDatabase(":memory:");

    try {
      const runId = insertScanRun(db, {
        startedAt: "2026-07-12T00:00:00.000Z",
        durationSeconds: 31_536_000,
        inputCount: 2,
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
      insertNameCheck(db, {
        scanRunId: runId,
        originalInput: "retry",
        normalizedLabel: "retry",
        fullName: "retry.eth",
        status: "error",
        expiryTimestamp: null,
        graceEndTimestamp: null,
        baseWei: null,
        premiumWei: null,
        totalWei: null,
        checkedBlock: null,
        errorMessage: "Too Many Requests",
      });

      expect([...queryReusableNormalizedLabels(db, ["foo", "retry", "bar"])]).toEqual([
        "foo",
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

      expect(
        queryLatestNameChecks(db, { limit: 10, includeAll: true, labelLength: null }),
      ).toEqual([
        expect.objectContaining({ full_name: "available.eth", status: "available" }),
        expect.objectContaining({ full_name: "registered.eth", status: "registered" }),
      ]);
    } finally {
      db.close();
    }
  });

  it("orders latest available rows by cheapest total price first", () => {
    const db = openScanDatabase(":memory:");

    try {
      const runId = insertScanRun(db, {
        startedAt: "2026-07-12T00:00:00.000Z",
        durationSeconds: 31_536_000,
        inputCount: 3,
      });

      insertNameCheck(db, {
        scanRunId: runId,
        originalInput: "expensive",
        normalizedLabel: "expensive",
        fullName: "expensive.eth",
        status: "available",
        expiryTimestamp: 0,
        graceEndTimestamp: 7_776_000,
        baseWei: "100000000000000000000",
        premiumWei: "0",
        totalWei: "100000000000000000000",
        checkedBlock: "123",
        errorMessage: null,
      });
      insertNameCheck(db, {
        scanRunId: runId,
        originalInput: "cheap-premium",
        normalizedLabel: "cheap-premium",
        fullName: "cheap-premium.eth",
        status: "temp_premium",
        expiryTimestamp: 0,
        graceEndTimestamp: 7_776_000,
        baseWei: "1000",
        premiumWei: "1000",
        totalWei: "2000",
        checkedBlock: "123",
        errorMessage: null,
      });
      insertNameCheck(db, {
        scanRunId: runId,
        originalInput: "mid",
        normalizedLabel: "mid",
        fullName: "mid.eth",
        status: "available",
        expiryTimestamp: 0,
        graceEndTimestamp: 7_776_000,
        baseWei: "10000",
        premiumWei: "0",
        totalWei: "10000",
        checkedBlock: "123",
        errorMessage: null,
      });

      const expectedNames = [
        "cheap-premium.eth",
        "mid.eth",
        "expensive.eth",
      ];

      expect(queryLatestAvailable(db, 100).map((row) => row.full_name)).toEqual(
        expectedNames,
      );
      expect(
        queryLatestNameChecks(db, {
          limit: null,
          includeAll: false,
          labelLength: null,
        }).map((row) => row.full_name),
      ).toEqual(expectedNames);
    } finally {
      db.close();
    }
  });

  it("filters latest rows by normalized label length", () => {
    const db = openScanDatabase(":memory:");

    try {
      const runId = insertScanRun(db, {
        startedAt: "2026-07-12T00:00:00.000Z",
        durationSeconds: 31_536_000,
        inputCount: 3,
      });

      insertNameCheck(db, {
        scanRunId: runId,
        originalInput: "four",
        normalizedLabel: "four",
        fullName: "four.eth",
        status: "available",
        expiryTimestamp: 0,
        graceEndTimestamp: 7_776_000,
        baseWei: "100",
        premiumWei: "0",
        totalWei: "100",
        checkedBlock: "123",
        errorMessage: null,
      });
      insertNameCheck(db, {
        scanRunId: runId,
        originalInput: "three",
        normalizedLabel: "tri",
        fullName: "tri.eth",
        status: "available",
        expiryTimestamp: 0,
        graceEndTimestamp: 7_776_000,
        baseWei: "50",
        premiumWei: "0",
        totalWei: "50",
        checkedBlock: "123",
        errorMessage: null,
      });
      insertNameCheck(db, {
        scanRunId: runId,
        originalInput: "five",
        normalizedLabel: "fiver",
        fullName: "fiver.eth",
        status: "available",
        expiryTimestamp: 0,
        graceEndTimestamp: 7_776_000,
        baseWei: "25",
        premiumWei: "0",
        totalWei: "25",
        checkedBlock: "123",
        errorMessage: null,
      });

      expect(
        queryLatestNameChecks(db, { limit: 100, includeAll: false, labelLength: 4 }),
      ).toEqual([expect.objectContaining({ full_name: "four.eth" })]);
    } finally {
      db.close();
    }
  });
});
