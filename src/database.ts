import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import {
  BASE_REGISTRAR_ADDRESS,
  CHAIN_NAME,
  CONTROLLER_ADDRESS,
  DEFAULT_DB_PATH,
  type NameStatus,
} from "./constants.js";

export type SqliteDatabase = Database.Database;

export interface ScanRunInput {
  startedAt: string;
  durationSeconds: number;
  inputCount: number;
}

export interface NameCheckInput {
  scanRunId: number;
  originalInput: string;
  normalizedLabel: string | null;
  fullName: string | null;
  status: NameStatus;
  expiryTimestamp: number | null;
  graceEndTimestamp: number | null;
  baseWei: string | null;
  premiumWei: string | null;
  totalWei: string | null;
  checkedBlock: string | null;
  errorMessage: string | null;
}

export interface LatestAvailableRow {
  scan_run_id: number;
  original_input: string;
  normalized_label: string;
  full_name: string;
  status: "available" | "temp_premium";
  base_wei: string | null;
  premium_wei: string | null;
  total_wei: string | null;
  checked_block: string | null;
}

export interface LatestNameCheckRow {
  scan_run_id: number;
  original_input: string;
  normalized_label: string;
  full_name: string;
  status: NameStatus;
  base_wei: string | null;
  premium_wei: string | null;
  total_wei: string | null;
  checked_block: string | null;
}

export function openScanDatabase(dbPath = DEFAULT_DB_PATH): SqliteDatabase {
  if (dbPath !== ":memory:") {
    mkdirSync(dirname(dbPath), { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  ensureSchema(db);
  return db;
}

export function ensureSchema(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS scan_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      chain TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL,
      base_registrar_address TEXT NOT NULL,
      controller_address TEXT NOT NULL,
      input_count INTEGER NOT NULL,
      scanned_count INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS name_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_run_id INTEGER NOT NULL REFERENCES scan_runs(id),
      original_input TEXT NOT NULL,
      normalized_label TEXT,
      full_name TEXT,
      status TEXT NOT NULL CHECK (
        status IN (
          'invalid',
          'registered',
          'grace_period',
          'temp_premium',
          'available',
          'error'
        )
      ),
      expiry_timestamp INTEGER,
      grace_end_timestamp INTEGER,
      base_wei TEXT,
      premium_wei TEXT,
      total_wei TEXT,
      checked_block TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_name_checks_normalized_label
      ON name_checks(normalized_label);
    CREATE INDEX IF NOT EXISTS idx_name_checks_status
      ON name_checks(status);
    CREATE INDEX IF NOT EXISTS idx_name_checks_scan_run_id
      ON name_checks(scan_run_id);
  `);
}

export function insertScanRun(db: SqliteDatabase, input: ScanRunInput): number {
  const info = db
    .prepare(`
      INSERT INTO scan_runs (
        started_at,
        chain,
        duration_seconds,
        base_registrar_address,
        controller_address,
        input_count
      )
      VALUES (
        @startedAt,
        @chain,
        @durationSeconds,
        @baseRegistrarAddress,
        @controllerAddress,
        @inputCount
      )
    `)
    .run({
      startedAt: input.startedAt,
      chain: CHAIN_NAME,
      durationSeconds: input.durationSeconds,
      baseRegistrarAddress: BASE_REGISTRAR_ADDRESS,
      controllerAddress: CONTROLLER_ADDRESS,
      inputCount: input.inputCount,
    });

  return Number(info.lastInsertRowid);
}

export function insertNameCheck(db: SqliteDatabase, input: NameCheckInput): void {
  db.prepare(`
    INSERT INTO name_checks (
      scan_run_id,
      original_input,
      normalized_label,
      full_name,
      status,
      expiry_timestamp,
      grace_end_timestamp,
      base_wei,
      premium_wei,
      total_wei,
      checked_block,
      error_message
    )
    VALUES (
      @scanRunId,
      @originalInput,
      @normalizedLabel,
      @fullName,
      @status,
      @expiryTimestamp,
      @graceEndTimestamp,
      @baseWei,
      @premiumWei,
      @totalWei,
      @checkedBlock,
      @errorMessage
    )
  `).run(input);
}

export function finishScanRun(
  db: SqliteDatabase,
  runId: number,
  finishedAt: string,
  scannedCount: number,
  errorCount: number,
): void {
  db.prepare(`
    UPDATE scan_runs
    SET
      finished_at = @finishedAt,
      scanned_count = @scannedCount,
      error_count = @errorCount
    WHERE id = @runId
  `).run({
    runId,
    finishedAt,
    scannedCount,
    errorCount,
  });
}

export function queryReusableNormalizedLabels(
  db: SqliteDatabase,
  normalizedLabels: string[],
): Set<string> {
  const reusableLabels = new Set<string>();
  const statement = db.prepare(`
    SELECT status
    FROM name_checks
    WHERE normalized_label = ?
    ORDER BY id DESC
    LIMIT 1
  `);

  for (const normalizedLabel of normalizedLabels) {
    const row = statement.get(normalizedLabel) as
      | { status: NameStatus }
      | undefined;

    if (row && row.status !== "error") {
      reusableLabels.add(normalizedLabel);
    }
  }

  return reusableLabels;
}

export function queryLatestAvailable(
  db: SqliteDatabase,
  limit: number,
): LatestAvailableRow[] {
  return queryLatestNameChecks(db, { limit, includeAll: false }) as LatestAvailableRow[];
}

export function queryLatestNameChecks(
  db: SqliteDatabase,
  options: { limit: number; includeAll: boolean },
): LatestNameCheckRow[] {
  const statusFilter = options.includeAll
    ? ""
    : "WHERE nc.status IN ('available', 'temp_premium')";

  return db
    .prepare(`
      WITH latest AS (
        SELECT normalized_label, MAX(id) AS latest_id
        FROM name_checks
        WHERE normalized_label IS NOT NULL
        GROUP BY normalized_label
      )
      SELECT
        nc.scan_run_id,
        nc.original_input,
        nc.normalized_label,
        nc.full_name,
        nc.status,
        nc.base_wei,
        nc.premium_wei,
        nc.total_wei,
        nc.checked_block
      FROM name_checks nc
      INNER JOIN latest ON latest.latest_id = nc.id
      ${statusFilter}
      ORDER BY
        CASE WHEN nc.total_wei IS NULL THEN 1 ELSE 0 END,
        length(nc.total_wei),
        nc.total_wei,
        CASE nc.status
          WHEN 'available' THEN 0
          WHEN 'temp_premium' THEN 1
          WHEN 'registered' THEN 2
          WHEN 'grace_period' THEN 3
          WHEN 'invalid' THEN 4
          ELSE 5
        END,
        nc.normalized_label
      LIMIT @limit
    `)
    .all({ limit: options.limit }) as LatestNameCheckRow[];
}
