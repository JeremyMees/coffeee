import { createError, getQuery, readBody } from 'h3'
import type { H3Event } from 'h3'
import type { z } from 'zod/mini'
import { fieldErrors } from '#shared/utils/validation'

function validate<Schema extends z.ZodMiniType>(
  schema: Schema,
  input: unknown,
): z.output<Schema> {
  const result = schema.safeParse(input)

  if (!result.success) {
    const errors = fieldErrors(result.error)

    throw createError({
      statusCode: 400,
      statusMessage: Object.values(errors)[0],
      data: { errors },
    })
  }

  return result.data
}

export async function readValidBody<Schema extends z.ZodMiniType>(
  event: H3Event,
  schema: Schema,
) {
  return validate(schema, await readBody(event))
}

export function readValidQuery<Schema extends z.ZodMiniType>(
  event: H3Event,
  schema: Schema,
) {
  return validate(schema, getQuery(event))
}
