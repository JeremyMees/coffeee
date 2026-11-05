import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  coffeeFormSteps,
  coffeeFormValues,
  coffeeSteps,
  firstStepWithError,
  stepHasError,
  serverErrors,
  zodSchema,
} from '~/utils/forms'

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

describe('coffeeFormSteps', () => {
  it('asks for every field of a new coffee exactly once', () => {
    const fields = coffeeFormSteps(true).flatMap(step => [...step.fields])

    expect(new Set(fields).size).toBe(fields.length)
    expect(fields.toSorted()).toEqual(
      Object.keys(newCoffeeSchema.in.shape).toSorted(),
    )
  })

  it('leaves out the first bag when editing', () => {
    expect(coffeeFormSteps(false).map(step => step.title)).toEqual([
      'Coffee',
      'Origin',
      'Taste',
    ])
  })
})

describe('stepHasError', () => {
  it('knows a step by its fields, nested ones too', () => {
    const [, origin] = coffeeFormSteps(true)

    expect(stepHasError(origin!, ['regions.0.name'])).toBe(true)
    expect(stepHasError(origin!, ['name'])).toBe(false)
  })
})

describe('firstStepWithError', () => {
  const steps = coffeeFormSteps(true)

  it('finds the earliest step with a field in error', () => {
    expect(firstStepWithError(steps, ['price', 'roastLevel'])).toBe(3)
    expect(firstStepWithError(steps, ['name'])).toBe(1)
  })

  it('finds no step without errors it knows', () => {
    expect(firstStepWithError(steps, [])).toBeNull()
    expect(firstStepWithError(steps, ['shelf'])).toBeNull()
    expect(firstStepWithError(coffeeFormSteps(false), ['price'])).toBeNull()
  })
})

describe('coffeeFormValues', () => {
  it('starts a new coffee with every detail empty', () => {
    expect(coffeeFormValues()).toStrictEqual({
      name: '',
      roaster: '',
      roastLevel: undefined,
      roastedFor: undefined,
      origins: [],
      regions: [],
      farms: [],
      washingStations: [],
      producers: [],
      processes: [],
      varietals: [],
      flavorNotes: [],
      link: '',
      altitudeFrom: '',
      altitudeTo: '',
    })
  })

  it('has a value for every field on the coffee steps', () => {
    const fields = coffeeSteps.flatMap(step => step.fields)

    expect(Object.keys(coffeeFormValues()).sort()).toEqual([...fields].sort())
  })
})
