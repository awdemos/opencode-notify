import { describe, expect, it } from "bun:test"
import { DEFAULT_CONFIG, validateNotifyConfig } from "../src/config"

describe("validateNotifyConfig", () => {
	it("accepts a valid minimal config and fills defaults", () => {
		const config = {
			enabled: false,
			sounds: {
				idle: "Glass",
			},
		}
		const validated = validateNotifyConfig(config)
		expect(validated.enabled).toBe(false)
		expect(validated.notifyChildSessions).toBe(DEFAULT_CONFIG.notifyChildSessions)
		expect(validated.sounds.idle).toBe("Glass")
		expect(validated.sounds.error).toBe(DEFAULT_CONFIG.sounds.error)
		expect(validated.quietHours.enabled).toBe(DEFAULT_CONFIG.quietHours.enabled)
	})

	it("rejects unknown top-level keys", () => {
		expect(() =>
			validateNotifyConfig({
				...DEFAULT_CONFIG,
				extraKey: "evil",
			}),
		).toThrow()
	})

	it("rejects unknown nested keys", () => {
		expect(() =>
			validateNotifyConfig({
				...DEFAULT_CONFIG,
				sounds: {
					...DEFAULT_CONFIG.sounds,
					unknown: "evil",
				},
			}),
		).toThrow()
	})

	it("rejects terminal values outside the allowlist", () => {
		expect(() =>
			validateNotifyConfig({
				...DEFAULT_CONFIG,
				terminal: 'foo"; do shell script "touch /tmp/pwned" --',
			}),
		).toThrow()
	})

	it("rejects invalid sound names", () => {
		expect(() =>
			validateNotifyConfig({
				...DEFAULT_CONFIG,
				sounds: {
					...DEFAULT_CONFIG.sounds,
					idle: "EvilSound",
				},
			}),
		).toThrow()
	})

	it("rejects malformed quiet-hours times", () => {
		expect(() =>
			validateNotifyConfig({
				...DEFAULT_CONFIG,
				quietHours: {
					enabled: true,
					start: "25:00",
					end: "08:00",
				},
			}),
		).toThrow()
	})

	it("accepts a valid terminal from the allowlist", () => {
		const config = validateNotifyConfig({
			...DEFAULT_CONFIG,
			terminal: "ghostty",
		})
		expect(config.terminal).toBe("ghostty")
	})
})
