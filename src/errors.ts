export function errorMessageFromCause(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
