# Security policy

## Report a vulnerability

Do not open a public issue for a potential vulnerability.

Use the repository's
[private vulnerability reporting form](https://github.com/Thurpan/ens-searcher/security/advisories/new).
Include the affected version, reproduction steps, and potential impact.

## Sensitive local files

Do not commit `.env`, `names.txt`, private key files, SQLite databases, or files
under `data/`. The repository ignores these paths, but verify staged changes
before each commit.
