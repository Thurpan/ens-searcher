# Command Reference

This project scans candidate ENS `.eth` names into a local SQLite database and
queries the latest saved results.

## Setup

Install dependencies:

```powershell
npm install
```

Create a local environment file:

```powershell
Copy-Item .env.example .env
```

Set `ETH_RPC_URL` in `.env` before running scans:

```text
ETH_RPC_URL=https://your-mainnet-rpc.example
ETH_USD_PRICE=
```

`ETH_USD_PRICE` is optional. Use it when you want query output to use a fixed
manual ETH/USD price instead of live lookup.

## Input Names

By default, scans read from `names.txt`.

```text
# names.txt
example
example.eth
```

Input rules:

- One name per line.
- Blank lines and comments are ignored.
- Names can be bare labels or `.eth` names.
- Labels shorter than 3 characters are rejected locally.

## Scan

Run a scan with defaults:

```powershell
npm run scan
```

Default scan behavior:

- Input file: `names.txt`
- Database: `data/ens-scans.sqlite`
- Registration duration for pricing: `365` days
- Network: Ethereum mainnet, using `ETH_RPC_URL`
- Interactive terminal output: a single-line progress bar for names being
  scanned, followed by an elapsed-time summary.

Scan usage:

```powershell
npm run scan -- [--file names.txt] [--db data/ens-scans.sqlite] [--duration-days 365] [--skip-existing]
```

Scan flags:

| Flag | Value | Default | Description |
| --- | --- | --- | --- |
| `--file` | Path | `names.txt` | Input file containing names to scan. |
| `--db` | Path | `data/ens-scans.sqlite` | SQLite database path. |
| `--duration-days` | Positive integer | `365` | Registration duration used for ENS price checks. |
| `--skip-existing` | None | Off | Skips labels whose latest database result is not `error`. Previous `error` results are retried. |
| `--help`, `-h` | None | Off | Prints scan help. |

Scan examples:

```powershell
npm run scan -- --file names.txt
npm run scan -- --file names-4.txt --db data/ens-scans.sqlite
npm run scan -- --duration-days 365 --skip-existing
```

Value flags also support equals syntax:

```powershell
npm run scan -- --file=names.txt --duration-days=365
```

When `--skip-existing` is enabled, the progress bar counts only names that still
need to be scanned after reusable database results are skipped.

## Query

Query the latest available and temporary-premium results:

```powershell
npm run query
```

Default query behavior:

- Database: `data/ens-scans.sqlite`
- Limit: `100` rows
- Statuses: `available` and `temp_premium`
- Sort order: cheapest first by total price

Query usage:

```powershell
npm run query -- [--db data/ens-scans.sqlite] [--limit 100] [--length 4] [--all] [--eth-usd 3500]
```

Query flags:

| Flag | Value | Default | Description |
| --- | --- | --- | --- |
| `--db` | Path | `data/ens-scans.sqlite` | SQLite database path. |
| `--limit` | Positive integer | `100` | Maximum number of rows to return. |
| `--length` | Positive integer | None | Returns only names with this many characters before `.eth`. |
| `--all` | None | Off | Includes latest rows for every status, including registered, invalid, grace-period, and error rows. |
| `--eth-usd` | Positive number | None | Uses a manual ETH/USD price instead of live lookup or `ETH_USD_PRICE`. |
| `--help`, `-h` | None | Off | Prints query help. |

Query examples:

```powershell
npm run query
npm run query -- --limit 100
npm run query -- --length 4
npm run query -- --length 4 --limit 100
npm run query -- --all
npm run query -- --eth-usd 3500
npm run query -- --db data/ens-scans.sqlite --length 4 --limit 100
```

Value flags also support equals syntax:

```powershell
npm run query -- --length=4 --limit=100 --eth-usd=3500
```

Query output columns:

| Column | Description |
| --- | --- |
| `name` | Full `.eth` name. |
| `status` | Latest saved lifecycle status. |
| `total_eth` | Total registration price in ETH. |
| `total_usd` | Total registration price in USD when an ETH/USD price is available. |
| `base_eth` | Base registration price in ETH. |
| `premium_eth` | Temporary premium price in ETH. |
| `run` | Scan run ID that produced the row. |

If no ETH/USD price is available, USD columns are left blank and the command
prints a warning. To avoid live price lookup, use either:

```powershell
npm run query -- --eth-usd 3500
```

or set this in `.env`:

```text
ETH_USD_PRICE=3500
```

## Validation Commands

Run the test suite:

```powershell
npm test
```

Run TypeScript typechecking:

```powershell
npm run typecheck
```

Build the project:

```powershell
npm run build
```

Run all validation commands:

```powershell
npm test
npm run typecheck
npm run build
```
