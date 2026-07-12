import "dotenv/config";
import { parseQueryArgs } from "./args.js";
import { openScanDatabase, queryLatestNameChecks } from "./database.js";
import { resolveEthUsdPrice, weiToEth4, weiToUsd } from "./priceDisplay.js";

async function main(): Promise<void> {
  const options = parseQueryArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const db = openScanDatabase(options.dbPath);

  try {
    const rows = queryLatestNameChecks(db, {
      limit: options.limit,
      includeAll: options.includeAll,
    });

    if (rows.length === 0) {
      console.log(
        options.includeAll
          ? "No latest results found."
          : "No latest available or temp-premium results found.",
      );
      return;
    }

    const ethUsdPrice = await resolveEthUsdPrice({
      cliPrice: options.ethUsdPrice,
      env: process.env,
    });

    if (ethUsdPrice === null) {
      console.warn(
        "USD price unavailable; pass --eth-usd 3500 or set ETH_USD_PRICE in .env for USD columns.",
      );
    } else {
      console.log(`ETH/USD: ${ethUsdPrice.usd.toFixed(2)} (${ethUsdPrice.source})`);
    }

    console.log(
      formatTable(
        [
          "name",
          "status",
          "total_eth",
          "total_usd",
          "base_eth",
          "premium_eth",
          "run",
        ],
        rows.map((row) => [
          row.full_name,
          row.status,
          weiToEth4(row.total_wei),
          weiToUsd(row.total_wei, ethUsdPrice),
          weiToEth4(row.base_wei),
          weiToEth4(row.premium_wei),
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
  npm run query -- [--db data/ens-scans.sqlite] [--limit 100] [--all] [--eth-usd 3500]

Options:
  --all          Include latest rows for every status, including registered names
  --eth-usd     Use a manual ETH/USD price instead of live lookup
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

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
