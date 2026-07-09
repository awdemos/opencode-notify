export type CmuxContext = {
	commandPath: string
	env: CmuxEnvironment
}

export type CmuxEnvironment = Record<string, string | undefined>

export type ResolveExecutable = (name: string) => string | undefined

export function canUseCmuxWorkflow(
	env: CmuxEnvironment,
	resolveExecutable: ResolveExecutable,
	cmuxCommand: string,
): boolean {
	return Boolean(resolveExecutable(cmuxCommand))
}

export function detectCmuxContext(env: CmuxEnvironment): CmuxContext | null {
	const cmuxWorkspaceId = env.CMUX_WORKSPACE_ID
	if (!cmuxWorkspaceId) return null
	return { commandPath: "cmux", env }
}