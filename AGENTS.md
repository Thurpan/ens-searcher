# Repository AGENTS.md

## Scope

This file adds repo-specific guidance for `ens-searcher`. It should reinforce
the global agent instructions without introducing a substantially different
workflow.

## Model and delegation routing

Use only `gpt-5.6-sol`, `gpt-5.6-terra`, and `gpt-5.6-luna`. Always set
reasoning effort to `xhigh`. Never select another reasoning effort.

The primary agent uses Sol and remains responsible for integration, validation,
and the final answer. Unnamed subagents use Terra. Use
`implementation_worker` for routine, scoped implementation or testing after the
design and security boundaries are settled.

Use Sol liberally for ambiguous or open-ended work, architecture, security,
trust boundaries, native Windows APIs, ABI, process containment, filesystem
identity, concurrency, interop, and difficult diagnosis. Use Sol after the first
straightforward attempt fails, for high-risk or high-value implementation, and
for review of every material implementation slice. Use `sol_specialist` for
complex work and `sol_reviewer` for read-only review of a coherent frozen slice
or final integration.

Use `mechanical_worker` only for deterministic, judgement-light work with an
exact result, such as formatting, inventories, repetitive transformations,
link checks, lint cleanup, or mechanical test expansion. Never assign Luna
security analysis, architecture, native or ABI decisions, difficult debugging,
HRC interaction, or final review.

Allow at most one active subagent. Do not run a reviewer beside an active
writer. Freeze the implementation slice before starting `sol_reviewer`.

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
