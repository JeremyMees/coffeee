import { createError, readBody } from 'h3'
import type { H3Event } from 'h3'
import type { z } from 'zod'
import { fieldErrors } from '#shared/utils/validation'

export async function readValidBody<Schema extends z.ZodType>(
  event: H3Event,
  schema: Schema,
): Promise<z.output<Schema>> {
  const result = schema.safeParse(await readBody(event))

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
