# Security Policy

## Supported Versions

Only the latest commit on the `main` branch is actively supported with security updates. Releases are not currently tagged; users should install from the repository `main` branch.

## Reporting a Vulnerability

If you discover a security vulnerability in `opencode-notify`, please report it privately to the maintainers.

- **Email:** security@awdemos.com
- Do not open a public issue for security-sensitive bugs.
- Include a description of the vulnerability, steps to reproduce, and the affected platform(s).

We aim to acknowledge reports within 72 hours and ship a fix within two weeks for high-severity issues.

## Security Hardening Measures

This project implements the following defenses:

- All AppleScript input is escaped before interpolation.
- Plugin configuration is validated against a strict Zod schema with an allowlisted `terminal` value set.
- External binaries (`alerter`, `cmux`, `git`, `xprop`, `swaymsg`, `hyprctl`) are resolved from PATH and verified for ownership and writability before execution.
- Notification content is sanitized to remove control characters and shell metacharacters.
- Dependencies are pinned in `package.json` and `registry.json`, and a `bun.lockb` is committed.
- A `uuid` override is in place to mitigate GHSA-w5hq-g745-h8pq until `node-notifier` updates.

## Running Security Checks Locally

```bash
bun install
bun run audit
bun run typecheck
bun test
```
