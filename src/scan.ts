import "dotenv/config";
import { parseScanArgs } from "./args.js";
import { runScan } from "./scanCore.js";

async function main(): Promise<void> {
  const options = parseScanArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const summary = await runScan({
    filePath: options.filePath,
    dbPath: options.dbPath,
    durationDays: options.durationDays,
    rpcUrl: process.env.ETH_RPC_URL,
  });

  console.log(`Scan run ${summary.runId} complete`);
  console.log(`Input names: ${summary.inputCount}`);
  console.log(`Rows written: ${summary.scannedCount}`);
  console.log(`Errors: ${summary.errorCount}`);
  console.log(`Database: ${summary.dbPath}`);
}

function printHelp(): void {
  console.log(`
Usage:
  npm run scan -- [--file names.txt] [--db data/ens-scans.sqlite] [--duration-days 365]

Environment:
  ETH_RPC_URL  Ethereum mainnet RPC URL, loaded from .env when present
`.trim());
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
