export type OscTitleContext = {
  readonly mayWriteOscTitle: boolean
  readonly baseTitle: string
}

export function parseOscTitleContext(): OscTitleContext | null {
  return null
}

export function writeOscTitleBestEffort(title: string): void {
  // No-op implementation
}