import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { escapeAppleScript } from "../src/kdco-primitives/shell"
import {
	isTrustedExecutablePath,
	resolveTrustedExecutable,
	sanitizeNotificationText,
} from "../src/security"

describe("escapeAppleScript", () => {
	it("escapes double quotes", () => {
		expect(escapeAppleScript('foo"bar')).toBe('foo\\"bar')
	})

	it("escapes backslashes", () => {
		expect(escapeAppleScript("foo\\bar")).toBe("foo\\\\bar")
	})

	it("neutralizes injection payloads", () => {
		const payload = 'foo"; do shell script "touch /tmp/pwned" --'
		const escaped = escapeAppleScript(payload)
		// There should be no unescaped quote-semicolon sequence.
		expect(escaped).not.toMatch(/(?<!\\)";/)
		expect(escaped).toBe('foo\\"; do shell script \\"touch /tmp/pwned\\" --')
	})

	it("rejects null bytes", () => {
		expect(() => escapeAppleScript("foo\x00bar")).toThrow("null bytes")
	})
})

describe("sanitizeNotificationText", () => {
	it("strips control characters", () => {
		expect(sanitizeNotificationText("hello\x00\x01world")).toBe("helloworld")
	})

	it("strips shell metacharacters", () => {
		expect(sanitizeNotificationText("hello`;|&<>$(){}[]\"\\world")).toBe("helloworld")
	})

	it("truncates to max length", () => {
		expect(sanitizeNotificationText("hello world", 5)).toBe("hello")
	})
})

describe("isTrustedExecutablePath", () => {
	let tempDir: string

	beforeAll(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "notify-security-test-"))
	})

	afterAll(() => {
		fs.rmSync(tempDir, { recursive: true, force: true })
	})

	it("rejects relative paths", () => {
		expect(isTrustedExecutablePath("./evil")).toBe(false)
	})

	it("rejects non-existent paths", () => {
		expect(isTrustedExecutablePath("/does/not/exist")).toBe(false)
	})

	it("rejects world-writable files", () => {
		const file = path.join(tempDir, "world-writable")
		fs.writeFileSync(file, "#!/bin/sh\necho hi")
		fs.chmodSync(file, 0o777)
		expect(isTrustedExecutablePath(file)).toBe(false)
	})

	it("rejects files owned by another user when not root", () => {
		const file = path.join(tempDir, "root-owned")
		fs.writeFileSync(file, "#!/bin/sh\necho hi")
		fs.chmodSync(file, 0o755)
		// Force an impossible UID so the ownership check fails.
		expect(isTrustedExecutablePath(file, { currentUserUid: -1 })).toBe(false)
	})

	it("accepts an executable owned by the current user", () => {
		const file = path.join(tempDir, "user-owned")
		fs.writeFileSync(file, "#!/bin/sh\necho hi")
		fs.chmodSync(file, 0o755)
		expect(isTrustedExecutablePath(file, { currentUserUid: process.getuid?.() })).toBe(true)
	})

	it("respects an allowlist of absolute paths", () => {
		const allowed = path.join(tempDir, "allowed")
		const other = path.join(tempDir, "other")
		fs.writeFileSync(allowed, "#!/bin/sh\necho hi")
		fs.writeFileSync(other, "#!/bin/sh\necho hi")
		fs.chmodSync(allowed, 0o755)
		fs.chmodSync(other, 0o755)
		expect(isTrustedExecutablePath(allowed, { allowedAbsolutePaths: [allowed] })).toBe(true)
		expect(isTrustedExecutablePath(other, { allowedAbsolutePaths: [allowed] })).toBe(false)
	})
})

describe("resolveTrustedExecutable", () => {
	it("returns undefined for commands not on PATH", () => {
		expect(resolveTrustedExecutable("definitely-not-a-real-command-12345")).toBeUndefined()
	})
})
