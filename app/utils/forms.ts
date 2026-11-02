import type { TypedSchema, TypedSchemaError } from 'vee-validate'
import type { z } from 'zod'

export function zodSchema<Schema extends z.ZodType>(
  schema: Schema,
): TypedSchema<z.input<Schema>, z.output<Schema>> {
  return {
    __type: 'VVTypedSchema',
    async parse(values) {
      const result = await schema.safeParseAsync(values)

      if (result.success) return { value: result.data, errors: [] }

      const errors = new Map<string, TypedSchemaError>()

      for (const issue of result.error.issues) {
        const path = issue.path.join('.')
        const error = errors.get(path) ?? { path, errors: [] }
        error.errors.push(issue.message)
        errors.set(path, error)
      }

      return { errors: [...errors.values()] }
    },
  }
}

export function serverErrors(caught: unknown) {
  const { statusMessage, data } = caught as FetchFailure
  const fields = data?.data?.errors ?? {}
  const hasFields = Object.keys(fields).length > 0

  return {
    fields,
    message: hasFields
      ? ''
      : statusMessage || 'Something went wrong. Try again.',
  }
}
