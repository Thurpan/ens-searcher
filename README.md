# ENS Searcher

Simple TypeScript scripts for scanning candidate `.eth` names from `names.txt`, saving scan history to SQLite, and querying the latest available results.

## Setup

```powershell
npm install
Copy-Item .env.example .env
```

Edit `.env` and set `ETH_RPC_URL` to your Ethereum mainnet RPC URL. The scanner loads this automatically when you run `npm run scan`.

Create a local `names.txt` file with one name per line. Blank lines and comments are ignored.
Names can be bare labels or `.eth` names, and labels shorter than 3 characters are rejected locally.

```text
# names.txt
example
example.eth
```

`names.txt`, `data/`, and `.env` files are ignored by git.

## Scripts

For a complete command reference, see [docs/commands.md](docs/commands.md).

Scan `names.txt` into `data/ens-scans.sqlite`:

```powershell
npm run scan
```

Optional scan flags:

```powershell
npm run scan -- --file names.txt --db data/ens-scans.sqlite --duration-days 365
npm run scan -- --skip-existing
```

Use `--skip-existing` to avoid rescanning labels whose latest database result is
not an error. Previous `error` results are retried.

Interactive scans show progress for names being scanned and print elapsed time
in the final summary.

Query the 100 latest available and temp-premium results, cheapest first:

```powershell
npm run query
```

Optional query flags:

```powershell
npm run query -- --db data/ens-scans.sqlite --limit 100
npm run query -- --length 4
npm run query -- --all
npm run query -- --rank-file data/names.short-alnum-common.txt --limit 100
npm run query -- --eth-usd 3500
```

Use `--rank-file` to print matching latest results in the order of a ranked
name file, with unranked rows following in the default cheapest-first order.

Query output shows ETH prices rounded to 4 decimal places and USD prices when an ETH/USD rate is available. By default it tries CoinGecko's keyless public API with no API key or auth headers; set `ETH_USD_PRICE` in `.env` or pass `--eth-usd` to use a manual rate instead.

## Validation

```powershell
npm run typecheck
npm test
npm run build
```
