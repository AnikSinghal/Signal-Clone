export function reportLovableError(error: Error, context?: Record<string, unknown>) {
  console.error("[Signal] Error:", error, context);
}
