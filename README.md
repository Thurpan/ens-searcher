# ENS Searcher

Simple TypeScript scripts for scanning candidate `.eth` names from `names.txt`, saving scan history to SQLite, and querying the latest available results.

## Setup

```powershell
npm install
Copy-Item .env.example .env
```

Edit `.env` and set `ETH_RPC_URL` to your Ethereum mainnet RPC URL. The scanner loads this automatically when you run `npm run scan`.

Create a local `names.txt` file with one name per line. Blank lines and comments are ignored.

```text
# names.txt
example
example.eth
```

`names.txt`, `data/`, and `.env` files are ignored by git.

## Scripts

Scan `names.txt` into `data/ens-scans.sqlite`:

```powershell
npm run scan
```

Optional scan flags:

```powershell
npm run scan -- --file names.txt --db data/ens-scans.sqlite --duration-days 365
```

Query the latest available and temp-premium results:

```powershell
npm run query
```

Optional query flags:

```powershell
npm run query -- --db data/ens-scans.sqlite --limit 100
```

## Validation

```powershell
npm run typecheck
npm test
npm run build
```
