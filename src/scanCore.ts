import { readFile } from "node:fs/promises";
import { BaseError } from "viem";
import {
  DEFAULT_DB_PATH,
  DEFAULT_DURATION_DAYS,
  DEFAULT_NAMES_FILE,
  SECONDS_PER_DAY,
  type NameStatus,
} from "./constants.js";
import {
  finishScanRun,
  insertNameCheck,
  insertScanRun,
  openScanDatabase,
  queryReusableNormalizedLabels,
  type NameCheckInput,
  type SqliteDatabase,
} from "./database.js";
import { createViemEnsClient, type EnsClient, type EnsCheck } from "./ensClient.js";
import { classifyLifecycle } from "./classification.js";
import { parseNamesFile, prepareCandidates, type PreparedCandidate } from "./input.js";

export interface RunScanOptions {
  filePath?: string;
  dbPath?: string;
  durationDays?: number;
  rpcUrl?: string;
  ensClient?: EnsClient;
  nowSeconds?: number;
  skipExisting?: boolean;
  onProgress?: (progress: ScanProgress) => void;
}

export interface ScanSummary {
  runId: number;
  inputCount: number;
  scannedCount: number;
  errorCount: number;
  skippedExistingCount: number;
  dbPath: string;
}

export interface ScanProgress {
  processedCount: number;
  totalCount: number;
  skippedExistingCount: number;
}

export async function runScan(options: RunScanOptions = {}): Promise<ScanSummary> {
  const filePath = options.filePath ?? DEFAULT_NAMES_FILE;
  const dbPath = options.dbPath ?? DEFAULT_DB_PATH;
  const durationDays = options.durationDays ?? DEFAULT_DURATION_DAYS;
  const durationSeconds = durationDays * SECONDS_PER_DAY;
  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const skipExisting = options.skipExisting ?? false;
  const rpcUrl = options.rpcUrl ?? process.env.ETH_RPC_URL;
  const ensClient = options.ensClient ?? createClientFromRpcUrl(rpcUrl);

  const content = await readNamesFile(filePath);
  const rawCandidates = parseNamesFile(content);
  const preparedCandidates = prepareCandidates(rawCandidates);

  const db = openScanDatabase(dbPath);
  const filteredCandidates = filterExistingCandidates(db, preparedCandidates, skipExisting);
  const startedAt = new Date().toISOString();
  const runId = insertScanRun(db, {
    startedAt,
    durationSeconds,
    inputCount: rawCandidates.length,
  });

  let scannedCount = 0;
  let errorCount = 0;
  const totalCount = filteredCandidates.candidates.length;
  const reportProgress = (): void => {
    options.onProgress?.({
      processedCount: scannedCount,
      totalCount,
      skippedExistingCount: filteredCandidates.skippedExistingCount,
    });
  };

  try {
    reportProgress();

    for (const candidate of filteredCandidates.candidates) {
      const row = await checkCandidate({
        candidate,
        ensClient,
        durationSeconds,
        runId,
        nowSeconds,
        rpcUrl,
      });

      insertNameCheck(db, row);
      scannedCount += 1;

      if (row.status === "error") {
        errorCount += 1;
      }

      reportProgress();
    }

    finishScanRun(db, runId, new Date().toISOString(), scannedCount, errorCount);

    return {
      runId,
      inputCount: rawCandidates.length,
      scannedCount,
      errorCount,
      skippedExistingCount: filteredCandidates.skippedExistingCount,
      dbPath,
    };
  } finally {
    db.close();
  }
}

function filterExistingCandidates(
  db: SqliteDatabase,
  candidates: PreparedCandidate[],
  skipExisting: boolean,
): { candidates: PreparedCandidate[]; skippedExistingCount: number } {
  if (!skipExisting) {
    return { candidates, skippedExistingCount: 0 };
  }

  const readyLabels = candidates
    .filter(
      (candidate): candidate is Extract<PreparedCandidate, { kind: "ready" }> =>
        candidate.kind === "ready",
    )
    .map((candidate) => candidate.normalizedLabel);
  const reusableLabels = queryReusableNormalizedLabels(db, readyLabels);
  let skippedExistingCount = 0;

  const filteredCandidates = candidates.filter((candidate) => {
    if (candidate.kind === "invalid") {
      return true;
    }

    if (!reusableLabels.has(candidate.normalizedLabel)) {
      return true;
    }

    skippedExistingCount += 1;
    return false;
  });

  return { candidates: filteredCandidates, skippedExistingCount };
}

async function checkCandidate(input: {
  candidate: PreparedCandidate;
  ensClient: EnsClient;
  durationSeconds: number;
  runId: number;
  nowSeconds: number;
  rpcUrl: string | undefined;
}): Promise<NameCheckInput> {
  const { candidate, ensClient, durationSeconds, runId, nowSeconds, rpcUrl } = input;

  if (candidate.kind === "invalid") {
    return nameCheckRow({
      runId,
      originalInput: candidate.originalInput,
      status: "invalid",
      errorMessage: candidate.errorMessage,
    });
  }

  try {
    const check = await ensClient.checkName(candidate.normalizedLabel, durationSeconds);
    return checkedNameRow({
      candidate,
      check,
      runId,
      nowSeconds,
    });
  } catch (error) {
    return nameCheckRow({
      runId,
      originalInput: candidate.originalInput,
      normalizedLabel: candidate.normalizedLabel,
      fullName: candidate.fullName,
      status: "error",
      errorMessage: errorMessage(error, rpcUrl),
    });
  }
}

function checkedNameRow(input: {
  candidate: Extract<PreparedCandidate, { kind: "ready" }>;
  check: EnsCheck;
  runId: number;
  nowSeconds: number;
}): NameCheckInput {
  const { candidate, check, runId, nowSeconds } = input;

  if (!check.valid) {
    return nameCheckRow({
      runId,
      originalInput: candidate.originalInput,
      normalizedLabel: candidate.normalizedLabel,
      fullName: candidate.fullName,
      status: "invalid",
      checkedBlock: check.checkedBlock.toString(),
      errorMessage: "Controller rejected label",
    });
  }

  const available = check.available;
  const expiryTimestamp = check.expiryTimestamp;
  const baseWei = check.baseWei;
  const premiumWei = check.premiumWei;
  const missingFields = [
    available === null ? "available" : null,
    expiryTimestamp === null ? "expiryTimestamp" : null,
    baseWei === null ? "baseWei" : null,
    premiumWei === null ? "premiumWei" : null,
  ].filter((field): field is string => field !== null);

  if (
    available === null ||
    expiryTimestamp === null ||
    baseWei === null ||
    premiumWei === null
  ) {
    return nameCheckRow({
      runId,
      originalInput: candidate.originalInput,
      normalizedLabel: candidate.normalizedLabel,
      fullName: candidate.fullName,
      status: "error",
      checkedBlock: check.checkedBlock.toString(),
      errorMessage: `ENS check omitted ${missingFields.join(", ")}`,
    });
  }

  const classification = classifyLifecycle(
    {
      available,
      expiryTimestamp,
      premiumWei,
    },
    nowSeconds,
  );
  const totalWei = baseWei + premiumWei;

  return nameCheckRow({
    runId,
    originalInput: candidate.originalInput,
    normalizedLabel: candidate.normalizedLabel,
    fullName: candidate.fullName,
    status: classification.status,
    expiryTimestamp: classification.expiryTimestamp,
    graceEndTimestamp: classification.graceEndTimestamp,
    baseWei: baseWei.toString(),
    premiumWei: premiumWei.toString(),
    totalWei: totalWei.toString(),
    checkedBlock: check.checkedBlock.toString(),
    errorMessage: classification.errorMessage,
  });
}

function nameCheckRow(input: {
  runId: number;
  originalInput: string;
  normalizedLabel?: string | null;
  fullName?: string | null;
  status: NameStatus;
  expiryTimestamp?: number | null;
  graceEndTimestamp?: number | null;
  baseWei?: string | null;
  premiumWei?: string | null;
  totalWei?: string | null;
  checkedBlock?: string | null;
  errorMessage?: string | null;
}): NameCheckInput {
  return {
    scanRunId: input.runId,
    originalInput: input.originalInput,
    normalizedLabel: input.normalizedLabel ?? null,
    fullName: input.fullName ?? null,
    status: input.status,
    expiryTimestamp: input.expiryTimestamp ?? null,
    graceEndTimestamp: input.graceEndTimestamp ?? null,
    baseWei: input.baseWei ?? null,
    premiumWei: input.premiumWei ?? null,
    totalWei: input.totalWei ?? null,
    checkedBlock: input.checkedBlock ?? null,
    errorMessage: input.errorMessage ?? null,
  };
}

function createClientFromRpcUrl(rpcUrl: string | undefined): EnsClient {
  if (!rpcUrl) {
    throw new Error("ETH_RPC_URL is required to scan ENS names");
  }

  return createViemEnsClient(rpcUrl);
}

async function readNamesFile(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      throw new Error(`Names file not found: ${filePath}`);
    }

    throw error;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function errorMessage(error: unknown, rpcUrl: string | undefined): string {
  let message: string;

  if (error instanceof BaseError) {
    message = error.shortMessage;
  } else if (error instanceof Error) {
    message = error.message;
  } else {
    message = String(error);
  }

  if (!rpcUrl) {
    return message;
  }

  return message.replaceAll(rpcUrl, "[redacted RPC URL]");
}
