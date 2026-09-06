# AGENTS.md — opencode-notify

Agent session entry point for the OpenCode native OS notifications plugin.

## Start here

1. Read `README.md` for the event-to-notification rules and platform support matrix.
2. Review `src/notify.ts`, `src/config.ts`, and `src/security.ts` before changing behavior.
3. `package.json` defines the OpenCode plugin contract and TypeScript toolchain.
4. Do not commit secrets or registry tokens.

## Project layout

```
src/
  notify.ts      Main plugin logic: event filtering, notification dispatch
  config.ts      Plugin configuration schema (Zod) and defaults
  security.ts    Input sanitization and trusted executable validation
tests/
  config.test.ts
  security.test.ts
registry.json    Plugin metadata for the OCX registry
```

## Development commands

```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Run tests (uses bun)
npm test

# Audit
npm run audit
```

## Key conventions

- TypeScript strict mode is enabled in `tsconfig.json`.
- Plugin entry point is `src/notify.ts` and is published via `registry.json`.
- Notifications are intentionally conservative: only `session.complete`, `session.error`, `permission.updated`, and direct questions notify by default.
- macOS focus detection suppresses `session.idle`/`session.error`/`permission.updated` when the terminal is focused; question notifications always bypass suppression.
- Security-critical helpers live in `src/security.ts` — sanitize text, validate executable paths, and reject world-writable binaries.

## Gotchas

- Tests require `bun` to be installed (`npm test` shells out to `bun test`).
- macOS desktop notifications require `alerter` on `PATH` (installed separately via Homebrew/MacPorts/release zip).
- Linux/Windows fall back to `node-notifier` / `SnoreToast`.
- When `CMUX_WORKSPACE_ID` is set, the plugin prefers `cmux notify` and falls back to desktop paths if that fails.

## Quality gates

Run before committing:

```bash
npm run typecheck
npm test
```
