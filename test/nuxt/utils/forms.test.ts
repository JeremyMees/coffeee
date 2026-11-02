import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { serverErrors, zodSchema } from '~/utils/forms'

const schema = zodSchema(
  z.object({
    name: z.string().trim().min(1, 'Give it a name'),
    size: z.number('Enter a size').positive('Too small'),
    tags: z.array(z.string().min(1, 'Empty tag')),
  }),
)

describe('zodSchema', () => {
  it('passes the parsed values on', async () => {
    expect(await schema.parse({ name: ' Halo ', size: 250, tags: [] })).toEqual(
      { value: { name: 'Halo', size: 250, tags: [] }, errors: [] },
    )
  })

  it('gives each field its messages by path', async () => {
    const { value, errors } = await schema.parse({
      name: '',
      size: -1,
      tags: ['ok', ''],
    })

    expect(value).toBeUndefined()
    expect(errors).toEqual([
      { path: 'name', errors: ['Give it a name'] },
      { path: 'size', errors: ['Too small'] },
      { path: 'tags.1', errors: ['Empty tag'] },
    ])
  })
})

describe('serverErrors', () => {
  it('reads the field errors the server sent', () => {
    const failure = {
      statusMessage: 'Give the coffee a name',
      data: { data: { errors: { name: 'Give the coffee a name' } } },
    }

    expect(serverErrors(failure)).toEqual({
      fields: { name: 'Give the coffee a name' },
      message: '',
    })
  })

  it('falls back to the status message', () => {
    expect(
      serverErrors({ statusMessage: 'That email is already invited' }),
    ).toEqual({ fields: {}, message: 'That email is already invited' })
  })

  it('says something went wrong when the server gave no reason', () => {
    expect(serverErrors(new Error('offline'))).toEqual({
      fields: {},
      message: 'Something went wrong. Try again.',
    })
  })
})
