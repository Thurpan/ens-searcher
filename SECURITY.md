# Security policy

## Report a vulnerability

Do not disclose potential vulnerability details in a public issue.

Use the repository's
[private vulnerability reporting form](https://github.com/Thurpan/ens-searcher/security/advisories/new).
Include the affected version, reproduction steps, and potential impact.

If the private form is unavailable, open a minimal public issue that asks the
maintainer for a private contact method. Do not include vulnerability details
in that issue.

## Sensitive local files

Do not commit `.env`, `names.txt`, private key files, SQLite databases, or files
under `data/`. The repository ignores these paths, but verify staged changes
before each commit.
