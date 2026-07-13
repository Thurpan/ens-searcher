# Repository AGENTS.md

## Scope

This file adds repo-specific guidance for `ens-searcher`. It should reinforce
the global agent instructions without introducing a substantially different
workflow.

## Project Context

- This is a TypeScript ESM CLI project for scanning ENS `.eth` names, storing
  scan history in SQLite, and querying latest saved results.
- CLI behavior is implemented under `src/`.
- Tests live under `test/`.
- User-facing command documentation lives in `README.md` and
  `docs/commands.md`.

## Working Rules

- Keep changes small, explicit, and easy to review.
- Read the relevant source and tests before editing.
- Follow existing parser, database, and test patterns instead of introducing new
  abstractions.
- Avoid new dependencies unless they are clearly necessary for the requested
  change.
- Do not hardcode secrets, RPC URLs, local database paths outside existing
  defaults, or environment-specific values.
- Preserve current CLI behavior unless the task explicitly asks to change it.

## Documentation Expectations

Update documentation when a change affects:

- CLI commands, flags, defaults, or examples.
- Query output columns, sorting, filtering, or status behavior.
- Scan behavior, input file rules, database location, or environment variables.
- Setup, validation, or operational workflow.

For CLI changes, update `docs/commands.md` first, then keep the shorter
`README.md` examples aligned when needed.

## Testing and Validation

Add or update tests for new logic, bug fixes, CLI parsing changes, database
query behavior, and important edge cases.

Choose validation based on the change. For docs-only changes, run:

```powershell
git diff --check
```

For code or config changes that can affect behavior, run:

```powershell
npm run typecheck
npm test
npm run build
```

For CLI help or command behavior changes, also run the relevant smoke check:

```powershell
npm run scan -- --help
npm run query -- --help
```

If a validation command cannot be run, report why and what remains unverified.

## Git Hygiene

- Work on a task branch for code, config, or docs changes.
- Stage only files related to the task.
- Commit with a concise message that reflects the actual change.
- Keep generated local data, `.env`, `names.txt`, and SQLite files out of git.
