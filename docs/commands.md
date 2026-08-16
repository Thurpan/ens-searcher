# Command Reference

This project scans candidate ENS `.eth` names into a local SQLite database and
queries the latest saved results.

## Setup

Install Node.js `20.19` or later on the Node.js 20 release line. For newer
release lines, install Node.js `22.12` or later.

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

Treat `ETH_RPC_URL` as a secret because provider credentials can be part of the
URL. Scan failures store a short diagnostic message and remove the configured
RPC URL before writing the error to SQLite.

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
- Network operations: read-only contract calls. The scanner does not submit
  transactions or register names.

Availability and prices are point-in-time observations. Run a new scan to
refresh saved results.

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
npm run query -- [--db data/ens-scans.sqlite] [--limit 100] [--length 4] [--all] [--rank-file data/names.short-alnum-common.txt] [--eth-usd 3500]
```

Query flags:

| Flag | Value | Default | Description |
| --- | --- | --- | --- |
| `--db` | Path | `data/ens-scans.sqlite` | SQLite database path. |
| `--limit` | Positive integer | `100` | Maximum number of rows to return. |
| `--length` | Positive integer | None | Returns only names with this many characters before `.eth`. |
| `--all` | None | Off | Includes latest rows for every status, including registered, invalid, grace-period, and error rows. |
| `--rank-file` | Path | None | Orders matching latest rows by a ranked names file before applying `--limit`. |
| `--eth-usd` | Positive number | None | Uses a manual ETH/USD price instead of live lookup or `ETH_USD_PRICE`. |
| `--help`, `-h` | None | Off | Prints query help. |

Query examples:

```powershell
npm run query
npm run query -- --limit 100
npm run query -- --length 4
npm run query -- --length 4 --limit 100
npm run query -- --all
npm run query -- --rank-file data/names.short-alnum-common.txt --limit 100
npm run query -- --eth-usd 3500
npm run query -- --db data/ens-scans.sqlite --length 4 --limit 100
```

Value flags also support equals syntax:

```powershell
npm run query -- --length=4 --rank-file=data/names.short-alnum-common.txt --limit=100 --eth-usd=3500
```

Rank files use the same name input rules as scan files: blank lines and
comments are ignored, names can be bare labels or `.eth` names, ENS
normalization is applied, and labels shorter than 3 characters are invalid.
Duplicate normalized labels keep their first rank. Invalid rank-file lines are
reported as a warning and skipped when at least one valid label remains. A rank
file with no valid labels stops the query with an error.

With `--rank-file`, the query first loads all latest rows matching the normal
status and length filters. Rows whose normalized labels appear in the rank file
are printed first in rank-file order. Unranked matching rows follow in the
default cheapest-first order. `--limit` is applied after this ordering. Without
`--all`, only `available` and `temp_premium` rows are eligible; with `--all`,
every latest status is eligible.

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

Run Oxlint with the anti-slop rules:

```powershell
npm run lint
```

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
npm run lint
npm test
npm run typecheck
npm run build
```
