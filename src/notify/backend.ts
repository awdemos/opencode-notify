import { resolveTrustedExecutable, sanitizeNotificationText } from "../security"

export type NotificationEventKind = "idle" | "error" | "permission" | "question"

interface NotifyBackendOptions {
	preferCmux: boolean
	tryCmuxNotify: () => Promise<boolean>
	sendDesktopNotification: () => void | Promise<void>
}

export interface DesktopNotificationOptions {
	title: string
	message: string
	subtitle?: string
	sound?: string
	senderBundleId?: string | null
	eventKind?: NotificationEventKind
}

export interface NodeNotifierLinuxOptions {
	title: string
	message: string
	icon: string
	urgency: "low" | "normal" | "critical"
	category: string
	"app-name": string
	hint: string
}

export interface NodeNotifierOptions {
	title: string
	message: string
	subtitle?: string
	sound?: string
	icon?: string
	urgency?: "low" | "normal" | "critical"
	category?: string
	"app-name"?: string
	hint?: string
}

interface DesktopNotificationRouterOptions extends DesktopNotificationOptions {
	platform: NodeJS.Platform | string
	sendNodeNotifierNotification: (options: NodeNotifierOptions) => void | Promise<void>
	sendMacOSNotification?: (options: DesktopNotificationOptions) => Promise<boolean>
}

interface AlerterProcess {
	exited: Promise<number>
}

interface AlerterRuntime {
	which?: (command: string) => string | null | Promise<string | null>
	spawnProcess?: (argv: string[]) => AlerterProcess
	warn?: (message: string) => void
}

const ALERTER_INSTALL_HINT =
	"install vjeantet/alerter (brew install vjeantet/tap/alerter) and ensure it is on PATH"

export function buildAlerterArguments(options: DesktopNotificationOptions): string[] {
	const argv = [
		"alerter",
		"--message",
		sanitizeNotificationText(options.message),
		"--title",
		sanitizeNotificationText(options.title),
	]

	if (options.subtitle) {
		argv.push("--subtitle", sanitizeNotificationText(options.subtitle))
	}

	if (options.sound) {
		argv.push("--sound", options.sound)
	}

	if (options.senderBundleId) {
		argv.push("--sender", options.senderBundleId)
	}

	return argv
}

export async function sendMacOSAlerterNotification(
	options: DesktopNotificationOptions,
	runtime: AlerterRuntime = {},
): Promise<boolean> {
	const which = runtime.which ?? ((command: string) => resolveTrustedExecutable(command) ?? null)
	const warn = runtime.warn ?? console.warn

	try {
		const alerterPath = await which("alerter")
		if (!alerterPath) {
			warn(`notify: macOS desktop notification skipped; alerter not found on PATH or untrusted (${ALERTER_INSTALL_HINT}).`)
			return false
		}

		const alerterArguments = buildAlerterArguments(options)
		const spawnProcess = runtime.spawnProcess ?? ((argv: string[]) => Bun.spawn(argv, { stdout: "ignore", stderr: "pipe" }))
		const process = spawnProcess([alerterPath, ...alerterArguments.slice(1)])
		const exitCode = await process.exited

		if (exitCode === 0) return true

		warn(`notify: macOS desktop notification skipped; alerter exited with code ${exitCode}.`)
		return false
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		warn(`notify: macOS desktop notification skipped; alerter failed (${message}).`)
		return false
	}
}

const MACOS_SOUND_BY_EVENT: Record<NotificationEventKind, string> = {
	idle: "Glass",
	error: "Basso",
	permission: "Submarine",
	question: "Submarine",
}

const LINUX_SOUND_BY_EVENT: Record<NotificationEventKind, string> = {
	idle: "complete",
	error: "dialog-error",
	permission: "bell",
	question: "bell",
}

const LINUX_ICON_BY_EVENT: Record<NotificationEventKind, string> = {
	idle: "dialog-information",
	error: "dialog-error",
	permission: "dialog-warning",
	question: "dialog-information",
}

const LINUX_URGENCY_BY_EVENT: Record<NotificationEventKind, "low" | "normal" | "critical"> = {
	idle: "low",
	error: "critical",
	permission: "normal",
	question: "normal",
}

const SOUND_NAME_ALIASES: Record<string, string> = {
	Glass: "Glass",
	Basso: "Basso",
	Submarine: "Submarine",
	Blow: "Blow",
	Bottle: "Bottle",
	Frog: "Frog",
	Funk: "Funk",
	Hero: "Hero",
	Morse: "Morse",
	Ping: "Ping",
	Pop: "Pop",
	Purr: "Purr",
	Sosumi: "Sosumi",
	Tink: "Tink",
	complete: "complete",
	"dialog-error": "dialog-error",
	"dialog-warning": "dialog-warning",
	bell: "bell",
	"message-new-instant": "message-new-instant",
}

export function resolveSoundName(
	platform: NodeJS.Platform | string,
	requestedSound: string | undefined,
	eventKind: NotificationEventKind | undefined,
): string | undefined {
	const canonicalRequested = requestedSound ? SOUND_NAME_ALIASES[requestedSound] : undefined
	if (canonicalRequested) {
		return canonicalRequested
	}

	if (eventKind) {
		return platform === "darwin" ? MACOS_SOUND_BY_EVENT[eventKind] : LINUX_SOUND_BY_EVENT[eventKind]
	}

	return undefined
}

function buildLinuxHint(soundName: string): string {
	return `string:sound-name:${soundName}`
}

function buildLinuxNodeNotifierOptions(
	options: DesktopNotificationOptions,
): NodeNotifierLinuxOptions {
	const eventKind = options.eventKind ?? "idle"
	const sound = resolveSoundName("linux", options.sound, eventKind) ?? LINUX_SOUND_BY_EVENT[eventKind]

	return {
		title: sanitizeNotificationText(options.title),
		message: sanitizeNotificationText(options.message),
		icon: LINUX_ICON_BY_EVENT[eventKind],
		urgency: LINUX_URGENCY_BY_EVENT[eventKind],
		category: "im.received",
		"app-name": "OpenCode",
		hint: buildLinuxHint(sound),
	}
}

export async function sendDesktopNotificationByPlatform(
	options: DesktopNotificationRouterOptions,
): Promise<void> {
	const {
		platform,
		sendNodeNotifierNotification,
		sendMacOSNotification,
		eventKind,
		...notificationOptions
	} = options

	if (platform === "darwin") {
		await (sendMacOSNotification ?? sendMacOSAlerterNotification)({
			...notificationOptions,
			sound: resolveSoundName(platform, notificationOptions.sound, eventKind),
		})
		return
	}

	await sendNodeNotifierNotification(buildLinuxNodeNotifierOptions(options))
}

export async function sendNotificationWithFallback(options: NotifyBackendOptions): Promise<void> {
	if (!options.preferCmux) {
		await options.sendDesktopNotification()
		return
	}

	try {
		const sentViaCmux = await options.tryCmuxNotify()
		if (sentViaCmux) return
	} catch {
		// Fall through to desktop notification fallback
	}

	await options.sendDesktopNotification()
}
