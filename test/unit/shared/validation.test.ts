import { describe, expect, it } from 'vitest'
import { z } from 'zod/mini'
import { fieldErrors } from '#shared/utils/validation'

function errorsOf(schema: z.ZodMiniType, value: unknown) {
  const result = schema.safeParse(value)

  return result.success ? {} : fieldErrors(result.error)
}

describe('fieldErrors', () => {
  it('gives the first message for each field', () => {
    const schema = z.object({
      name: z
        .string()
        .check(z.minLength(2, 'Too short'), z.regex(/^[A-Z]/, 'Start big')),
      size: z.number('Enter a number'),
    })

    expect(errorsOf(schema, { name: 'a', size: 'big' })).toEqual({
      name: 'Too short',
      size: 'Enter a number',
    })
  })

  it('keys a nested problem by its top field', () => {
    const schema = z.object({ bag: z.object({ grams: z.number('Grams') }) })

    expect(errorsOf(schema, { bag: {} })).toEqual({ bag: 'Grams' })
  })

  it('puts a problem with the whole form under form', () => {
    const schema = z
      .object({ from: z.number(), to: z.number() })
      .check(z.refine(range => range.from < range.to, 'Start before the end'))

    expect(errorsOf(schema, { from: 2, to: 1 })).toEqual({
      form: 'Start before the end',
    })
  })
})
