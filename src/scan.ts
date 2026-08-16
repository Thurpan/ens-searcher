import "dotenv/config";
import { parseScanArgs } from "./args.js";
import { errorMessageFromCause } from "./errors.js";
import { runScan } from "./scanCore.js";
import { createScanProgressReporter, formatElapsedTime } from "./scanProgress.js";

async function main(): Promise<void> {
  const options = parseScanArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const startedAtMs = Date.now();
  const summary = await runScan({
    filePath: options.filePath,
    dbPath: options.dbPath,
    durationDays: options.durationDays,
    rpcUrl: process.env.ETH_RPC_URL,
    skipExisting: options.skipExisting,
    onProgress: createScanProgressReporter(process.stdout),
  });
  const elapsedMs = Date.now() - startedAtMs;

  console.log(`Scan run ${summary.runId} complete`);
  console.log(`Input names: ${summary.inputCount}`);
  if (options.skipExisting) {
    console.log(`Skipped existing: ${summary.skippedExistingCount}`);
  }
  console.log(`Rows written: ${summary.scannedCount}`);
  console.log(`Errors: ${summary.errorCount}`);
  console.log(`Elapsed: ${formatElapsedTime(elapsedMs)}`);
  console.log(`Database: ${summary.dbPath}`);
}

function printHelp(): void {
  console.log(`
Usage:
  npm run scan -- [--file names.txt] [--db data/ens-scans.sqlite] [--duration-days 365] [--skip-existing]

Options:
  --skip-existing  Do not rescan labels already present in the database

Environment:
  ETH_RPC_URL  Ethereum mainnet RPC URL, loaded from .env when present
`.trim());
}

main().catch((cause: unknown) => {
  console.error(errorMessageFromCause(cause));
  process.exitCode = 1;
});
