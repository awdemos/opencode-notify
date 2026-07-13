/**
 * Security primitives for executable resolution and notification sanitization.
 *
 * @module security
 */

import * as fs from "node:fs"
import * as path from "node:path"

export interface TrustedExecutableOptions {
	/** Optional UID of the current user. Defaults to `process.getuid()` on POSIX. */
	currentUserUid?: number
	/** Optional allowlist of absolute paths. If provided, the resolved binary must match one exactly. */
	allowedAbsolutePaths?: readonly string[]
}

/**
 * Resolve a command name from PATH and verify it points to a trusted binary.
 *
 * Trust requirements:
 * - Path is absolute.
 * - File exists and is a regular file.
 * - File is executable (POSIX).
 * - Owner is root or the current user.
 * - File is not world-writable.
 */
export function resolveTrustedExecutable(
	commandName: string,
	options: TrustedExecutableOptions = {},
): string | undefined {
	const resolved = Bun.which(commandName)?.trim()
	if (!resolved) return undefined

	if (!isTrustedExecutablePath(resolved, options)) return undefined

	return path.resolve(resolved)
}

/**
 * Verify that an absolute path points to a trusted executable.
 */
export function isTrustedExecutablePath(
	candidatePath: string,
	options: TrustedExecutableOptions = {},
): boolean {
	if (!path.isAbsolute(candidatePath)) return false

	const absoluteCandidate = path.resolve(candidatePath)
	const realCandidate = realpathBestEffort(absoluteCandidate)

	if (options.allowedAbsolutePaths !== undefined && options.allowedAbsolutePaths.length > 0) {
		const allowed = options.allowedAbsolutePaths.map((allowedPath) => path.resolve(allowedPath))
		const isAllowed = allowed.some(
			(allowedPath) => realCandidate === allowedPath || absoluteCandidate === allowedPath,
		)
		if (!isAllowed) return false
	}

	try {
		const stats = fs.statSync(realCandidate)
		if (!stats.isFile()) return false

		if (process.platform !== "win32") {
			const mode = stats.mode
			if ((mode & 0o111) === 0) return false

			const currentUid = options.currentUserUid ?? process.getuid?.()
			const ownerUid = stats.uid
			if (ownerUid !== 0 && ownerUid !== currentUid) return false

			if ((mode & 0o002) !== 0) return false
		}

		return true
	} catch {
		return false
	}
}

function realpathBestEffort(filePath: string): string {
	try {
		return fs.realpathSync(filePath)
	} catch {
		return path.resolve(filePath)
	}
}

/**
 * Characters that must never reach notification backends.
 *
 * Includes C0/C1 control characters and shell/argument metacharacters that
 * could be misused by legacy notification helpers that pass input to a shell.
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: intentional security filter
const NOTIFICATION_FORBIDDEN_CHARS = /[\x00-\x1f\x7f-\x9f`"$\\;|&<>(){}[\]\n\r]/g

/**
 * Sanitize a string before handing it to a notification backend.
 *
 * Strips control characters and shell metacharacters. Optionally truncates to
 * a maximum length.
 */
export function sanitizeNotificationText(value: string, maxLength?: number): string {
	const sanitized = value.replace(NOTIFICATION_FORBIDDEN_CHARS, "")
	if (maxLength !== undefined && maxLength > 0) {
		return sanitized.slice(0, maxLength)
	}
	return sanitized
}
