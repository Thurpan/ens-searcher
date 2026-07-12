import "dotenv/config";
import { parseQueryArgs } from "./args.js";
import { openScanDatabase, queryLatestNameChecks } from "./database.js";
import { resolveEthUsdPrice, weiToEth4, weiToUsd } from "./priceDisplay.js";
import { formatTable, type ColumnAlignment } from "./table.js";

const QUERY_TABLE_ALIGNMENTS: ColumnAlignment[] = [
  "left",
  "left",
  "right",
  "right",
  "right",
  "right",
  "right",
];

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
      labelLength: options.labelLength,
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
        QUERY_TABLE_ALIGNMENTS,
      ),
    );
  } finally {
    db.close();
  }
}

function printHelp(): void {
  console.log(`
Usage:
  npm run query -- [--db data/ens-scans.sqlite] [--limit 100] [--length 4] [--all] [--eth-usd 3500]

Options:
  --length      Include only names with this many characters before .eth
  --all          Include latest rows for every status, including registered names
  --eth-usd     Use a manual ETH/USD price instead of live lookup
`.trim());
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
