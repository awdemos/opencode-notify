export type CmuxSessionStatusTransition = {
  readonly sessionID: string
  readonly logicalState:
    | "idle"
    | "busy"
    | "animated-busy"
    | "permission-needed"
    | "question-needed"
    | "error"
  readonly toolName?: string
}

export function buildCmuxSessionStatusTransitionForEvent(
  eventType: string,
  properties: Record<string, unknown>,
): CmuxSessionStatusTransition | null {
  const sessionID = toNonEmptyString(properties.sessionID)
  if (!sessionID) return null

  switch (eventType) {
    case "session.idle":
      return { sessionID, logicalState: "idle" }
    case "session.status":
      return { sessionID, logicalState: "busy" }
    case "session.error":
      return { sessionID, logicalState: "error" }
    case "permission.updated":
    case "permission.asked":
      return { sessionID, logicalState: "permission-needed" }
    default:
      return null
  }
}

export function buildCmuxSessionStatusTransitionForQuestionTool(
  sessionID: string,
): CmuxSessionStatusTransition {
  return { sessionID, logicalState: "question-needed", toolName: "question" }
}

export function getCmuxSessionStatusText(logicalState: CmuxSessionStatusTransition["logicalState"]): string {
  switch (logicalState) {
    case "busy":
      return "⏳ Working..."
    case "animated-busy":
      return "⏳ Working..."
    case "permission-needed":
      return "🚫 Needs permission"
    case "question-needed":
      return "❓ Needs answer"
    case "error":
      return "❌ Error"
    case "idle":
      return ""
  }
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const normalized = value.trim()
  if (!normalized) return null
  return normalized
}