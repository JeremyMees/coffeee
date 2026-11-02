import type { z } from 'zod'

export function fieldErrors(error: z.ZodError) {
  const errors: Record<string, string> = {}

  for (const issue of error.issues) {
    errors[String(issue.path[0] ?? 'form')] ??= issue.message
  }

  return errors
}
