# ENS Searcher

Scan candidate `.eth` names, save each result to a local SQLite database, and
query the latest stored result for each name.

The scanner makes read-only Ethereum calls. It does not register names, connect
to a wallet, or submit transactions. Availability and prices are point-in-time
observations and can change after a scan.

## Requirements

- Node.js `20.19` or later on the Node.js 20 release line.
- Node.js `22.12` or later on newer release lines.
- npm.
- An Ethereum mainnet RPC URL.

## Setup

### 1. Download and install

```powershell
git clone https://github.com/Thurpan/ens-searcher.git
Set-Location ens-searcher
npm install
```

On macOS or Linux, replace `Set-Location ens-searcher` with
`cd ens-searcher`.

### 2. Configure the Ethereum connection

Copy the example environment file.

```powershell
Copy-Item .env.example .env
```

On macOS or Linux, use:

```bash
cp .env.example .env
```

Open `.env` and replace the placeholder with an Ethereum mainnet RPC URL:

```dotenv
ETH_RPC_URL=https://your-mainnet-rpc.example
ETH_USD_PRICE=
```

`ETH_USD_PRICE` is optional. Leave it blank to let the query command request a
current ETH/USD price from CoinGecko. Set a positive number to use a fixed rate.

RPC URLs often contain provider credentials. Do not commit or share `.env`.

### 3. Add names to scan

Create `names.txt` in the repository root. Add one candidate per line:

```text
# Blank lines and comments are ignored.
example
sample.eth
another-name
```

Names can be bare labels or complete `.eth` names. The scanner applies ENS
normalisation and removes duplicate normalised labels. Labels shorter than
three characters and subnames such as `sub.example.eth` are rejected locally.

The `.gitignore` file excludes `.env`, `names.txt`, and the local `data/`
directory.

## Use

### Scan candidate names

Run the default scan:

```powershell
npm run scan
```

The command reads `names.txt`, requests availability and one-year registration
prices, and writes the results to `data/ens-scans.sqlite`. It prints progress
and a summary when the scan finishes.

Run the scanner again with `--skip-existing` to skip names whose latest stored
result is not an error. Names with a previous `error` result are retried.

```powershell
npm run scan -- --skip-existing
```

Use a different input file, database, or registration duration when required:

```powershell
npm run scan -- --file candidates.txt
npm run scan -- --db data/custom.sqlite
npm run scan -- --duration-days 730
npm run scan -- --file candidates.txt --db data/custom.sqlite --duration-days 730
```

### Query saved results

Query the default database:

```powershell
npm run query
```

By default, the command prints up to 100 `available` and `temp_premium` names.
It orders results by total registration price, with the cheapest first.

Common queries:

```powershell
# Return at most 25 results.
npm run query -- --limit 25

# Return only four-character labels.
npm run query -- --length 4

# Include registered, grace-period, invalid, and error results.
npm run query -- --all

# Query a different database.
npm run query -- --db data/custom.sqlite

# Use a fixed ETH/USD rate instead of the environment or live lookup.
npm run query -- --eth-usd 3500
```

The output includes the name, status, total ETH and USD prices, base ETH price,
temporary premium, and scan run ID. USD values are blank when no ETH/USD price
is available.

### Apply a preferred name order

Use `--rank-file` to put selected names first. The rank file uses the same
format as `names.txt`.

```powershell
npm run query -- --rank-file preferred-names.txt --limit 100
```

Matching names follow the order in the rank file. Other matching results follow
in their normal cheapest-first order. The command applies `--limit` after it
orders the results.

### View command help

```powershell
npm run scan -- --help
npm run query -- --help
```

See [docs/commands.md](docs/commands.md) for every flag, default, status, and
query output column.

## Data and safety

- The scanner stores all scan history locally in SQLite.
- The query command selects the latest stored row for each normalised name.
- Scan errors contain a short diagnostic message. The scanner removes the
  configured RPC URL before it writes an error to SQLite.
- A successful scan does not reserve or register a name.
- Recheck availability and prices before you make a registration decision.

## Development

Run the project checks:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

## Security

Report security issues privately. See [SECURITY.md](SECURITY.md) for the
reporting process.

## Licence

This project uses the [MIT No Attribution licence](LICENSE). You can use,
modify, distribute, sublicense, or sell the software without an attribution
requirement.
