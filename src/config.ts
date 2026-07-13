/**
 * Strict, allowlisted configuration for the notify plugin.
 *
 * @module config
 */

import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { z } from "zod"

export const ALLOWED_TERMINALS = [
	"ghostty",
	"kitty",
	"iterm",
	"iterm2",
	"wezterm",
	"alacritty",
	"terminal",
	"apple_terminal",
	"hyper",
	"warp",
	"vscode",
	"vscode-insiders",
] as const

const ALLOWED_SOUND_NAMES = [
	"Glass",
	"Basso",
	"Submarine",
	"Blow",
	"Bottle",
	"Frog",
	"Funk",
	"Hero",
	"Morse",
	"Ping",
	"Pop",
	"Purr",
	"Sosumi",
	"Tink",
	"complete",
	"dialog-error",
	"dialog-warning",
	"bell",
	"message-new-instant",
] as const

export interface NotifyConfig {
	enabled: boolean
	notifyChildSessions: boolean
	notifyOnIdle: boolean
	sounds: {
		idle: string
		error: string
		permission: string
		question?: string
	}
	quietHours: {
		enabled: boolean
		start: string
		end: string
	}
	terminal?: string
}

export const DEFAULT_CONFIG: NotifyConfig = {
	enabled: true,
	notifyChildSessions: false,
	notifyOnIdle: true,
	sounds: {
		idle: "Glass",
		error: "Basso",
		permission: "Submarine",
	},
	quietHours: {
		enabled: false,
		start: "22:00",
		end: "08:00",
	},
}

const timeSchema = z
	.string()
	.regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in 24-hour HH:MM format")

const soundSchema = z.enum(ALLOWED_SOUND_NAMES)
const terminalSchema = z.enum(ALLOWED_TERMINALS)

const partialSoundsSchema = z
	.object({
		idle: soundSchema.optional(),
		error: soundSchema.optional(),
		permission: soundSchema.optional(),
		question: soundSchema.optional(),
	})
	.strict()

const partialQuietHoursSchema = z
	.object({
		enabled: z.boolean().optional(),
		start: timeSchema.optional(),
		end: timeSchema.optional(),
	})
	.strict()

const partialConfigSchema = z
	.object({
		enabled: z.boolean().optional(),
		notifyChildSessions: z.boolean().optional(),
		notifyOnIdle: z.boolean().optional(),
		sounds: partialSoundsSchema.optional(),
		quietHours: partialQuietHoursSchema.optional(),
		terminal: terminalSchema.optional(),
	})
	.strict()

export function validateNotifyConfig(value: unknown): NotifyConfig {
	const partial = partialConfigSchema.parse(value)

	return {
		enabled: partial.enabled ?? DEFAULT_CONFIG.enabled,
		notifyChildSessions: partial.notifyChildSessions ?? DEFAULT_CONFIG.notifyChildSessions,
		notifyOnIdle: partial.notifyOnIdle ?? DEFAULT_CONFIG.notifyOnIdle,
		sounds: {
			idle: partial.sounds?.idle ?? DEFAULT_CONFIG.sounds.idle,
			error: partial.sounds?.error ?? DEFAULT_CONFIG.sounds.error,
			permission: partial.sounds?.permission ?? DEFAULT_CONFIG.sounds.permission,
			question: partial.sounds?.question ?? DEFAULT_CONFIG.sounds.question,
		},
		quietHours: {
			enabled: partial.quietHours?.enabled ?? DEFAULT_CONFIG.quietHours.enabled,
			start: partial.quietHours?.start ?? DEFAULT_CONFIG.quietHours.start,
			end: partial.quietHours?.end ?? DEFAULT_CONFIG.quietHours.end,
		},
		terminal: partial.terminal,
	}
}

export async function loadConfig(): Promise<NotifyConfig> {
	const configDir = path.join(os.homedir(), ".config", "opencode")
	const preferredPath = path.join(configDir, "opencode-notify.json")
	const legacyPath = path.join(configDir, "kdco-notify.json")

	const candidates = [preferredPath, legacyPath]
	for (const configPath of candidates) {
		try {
			const content = await fs.readFile(configPath, "utf8")
			const parsed = JSON.parse(content) as unknown
			return validateNotifyConfig(parsed)
		} catch (error) {
			if (error instanceof Error) {
				console.warn(`notify: invalid config at ${configPath}: ${error.message}. Using defaults.`)
			}
			continue
		}
	}

	return DEFAULT_CONFIG
}
