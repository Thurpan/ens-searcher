import { formatEther } from "viem";
import { parseQueryArgs } from "./args.js";
import { openScanDatabase, queryLatestAvailable } from "./database.js";

async function main(): Promise<void> {
  const options = parseQueryArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const db = openScanDatabase(options.dbPath);

  try {
    const rows = queryLatestAvailable(db, options.limit);

    if (rows.length === 0) {
      console.log("No latest available or temp-premium results found.");
      return;
    }

    console.log(
      formatTable(
        ["name", "status", "price_eth", "base_wei", "premium_wei", "run"],
        rows.map((row) => [
          row.full_name,
          row.status,
          weiToEth(row.total_wei),
          row.base_wei ?? "",
          row.premium_wei ?? "",
          String(row.scan_run_id),
        ]),
      ),
    );
  } finally {
    db.close();
  }
}

function printHelp(): void {
  console.log(`
Usage:
  npm run query -- [--db data/ens-scans.sqlite] [--limit 100]
`.trim());
}

function formatTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((header, columnIndex) =>
    Math.max(
      header.length,
      ...rows.map((row) => (row[columnIndex] ?? "").length),
    ),
  );
  const formatRow = (row: string[]) =>
    row.map((cell, index) => cell.padEnd(widths[index] ?? 0)).join("  ");
  const divider = widths.map((width) => "-".repeat(width)).join("  ");

  return [formatRow(headers), divider, ...rows.map(formatRow)].join("\n");
}

function weiToEth(wei: string | null): string {
  if (wei === null) {
    return "";
  }

  return formatEther(BigInt(wei));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
