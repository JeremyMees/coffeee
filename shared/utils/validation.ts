import type { z } from 'zod/mini'

export function fieldErrors(error: z.core.$ZodError) {
  const errors: Record<string, string> = {}

  for (const issue of error.issues) {
    errors[String(issue.path[0] ?? 'form')] ??= issue.message
  }

  return errors
}
