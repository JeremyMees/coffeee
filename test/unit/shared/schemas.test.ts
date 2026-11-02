import { describe, expect, it } from 'vitest'
import type { z } from 'zod'
import {
  coffeeDetailsSchema,
  inviteEmailSchema,
  newCoffeeSchema,
  regionSearchSchema,
  newShelfSchema,
} from '#shared/utils/schemas'
import { fieldErrors } from '#shared/utils/validation'

function errorsOf(schema: z.ZodType, value: unknown) {
  const result = schema.safeParse(value)

  return result.success ? {} : fieldErrors(result.error)
}

const coffee = {
  name: 'Ayele Fulasa',
  roaster: 'Square Mile',
  roastLevel: 'light',
  roastedFor: 'filter',
  colour: '#e4572e',
  origins: ['ET'],
  purchasedOn: '2026-11-02',
  roastedOn: null,
  sizeGrams: null,
  price: null,
}

describe('newCoffeeSchema', () => {
  it('accepts a coffee with only the required details', () => {
    expect(newCoffeeSchema.parse(coffee)).toEqual({
      ...coffee,
      regions: [],
      altitudeFrom: null,
      altitudeTo: null,
    })
  })

  it('trims names and accepts every optional purchase detail', () => {
    const parsed = newCoffeeSchema.parse({
      ...coffee,
      name: '  Ayele Fulasa ',
      roastedOn: '2026-10-28',
      sizeGrams: 250,
      price: 16.5,
    })

    expect(parsed).toMatchObject({ name: 'Ayele Fulasa', price: 16.5 })
  })

  it('reads blank and typed form values', () => {
    const parsed = newCoffeeSchema.parse({
      ...coffee,
      roastedOn: '',
      sizeGrams: '250',
      price: '',
    })

    expect(parsed).toMatchObject({
      roastedOn: null,
      sizeGrams: 250,
      price: null,
    })
  })

  it('explains a size that is not a number', () => {
    expect(errorsOf(newCoffeeSchema, { ...coffee, sizeGrams: 'big' })).toEqual({
      sizeGrams: 'Enter the size in grams',
    })
  })

  it('explains every missing required detail in plain words', () => {
    expect(errorsOf(newCoffeeSchema, {})).toEqual({
      name: 'Give the coffee a name',
      roaster: 'Pick a roaster or add a new one',
      roastLevel: 'Pick a roast level',
      roastedFor: 'Pick what it was roasted for',
      colour: 'Pick a colour',
      origins: 'Pick where it was grown',
      purchasedOn: 'Enter the date you bought it',
    })
  })

  it('explains purchase details that make no sense', () => {
    const errors = errorsOf(newCoffeeSchema, {
      ...coffee,
      name: '   ',
      roastedOn: '28/10/2026',
      sizeGrams: 0,
      price: -2,
    })

    expect(errors).toEqual({
      name: 'Give the coffee a name',
      roastedOn: 'Enter the roast date as a date',
      sizeGrams: 'The size has to be more than 0 g',
      price: "The price can't be negative",
    })
  })
})

describe('where a coffee was grown', () => {
  const details = {
    name: 'Huila Blend',
    roaster: 'Square Mile',
    roastLevel: 'light',
    roastedFor: 'filter',
    colour: '#e4572e',
    origins: ['CO'],
  }

  it('keeps each origin once', () => {
    expect(
      coffeeDetailsSchema.parse({ ...details, origins: ['CO', 'ET', 'CO'] })
        .origins,
    ).toEqual(['CO', 'ET'])
  })

  it('only takes countries from the list', () => {
    expect(
      errorsOf(coffeeDetailsSchema, { ...details, origins: ['CO', 'XX'] }),
    ).toEqual({ origins: 'Pick countries from the list' })
  })

  it('takes a single altitude as both ends of the range', () => {
    expect(
      coffeeDetailsSchema.parse({
        ...details,
        altitudeFrom: '',
        altitudeTo: '1850',
      }),
    ).toMatchObject({ altitudeFrom: 1850, altitudeTo: 1850 })
    expect(
      coffeeDetailsSchema.parse({ ...details, altitudeFrom: 1700 }),
    ).toMatchObject({ altitudeFrom: 1700, altitudeTo: 1700 })
  })

  it('explains an altitude range that makes no sense', () => {
    expect(
      errorsOf(coffeeDetailsSchema, {
        ...details,
        altitudeFrom: 2100,
        altitudeTo: 1700,
      }),
    ).toEqual({ altitudeTo: "The highest altitude can't be below the lowest" })
    expect(
      errorsOf(coffeeDetailsSchema, {
        ...details,
        altitudeFrom: -10,
        altitudeTo: 7000.5,
      }),
    ).toEqual({
      altitudeFrom: "The altitude can't be below sea level",
      altitudeTo: 'Enter the highest altitude in whole metres',
    })
  })

  it('trims region names', () => {
    expect(
      coffeeDetailsSchema.parse({
        ...details,
        regions: [{ origin: 'CO', name: ' Huila ' }],
      }).regions,
    ).toEqual([{ origin: 'CO', name: 'Huila' }])
  })

  it('explains regions that make no sense', () => {
    const regionErrors = (regions: unknown) =>
      errorsOf(coffeeDetailsSchema, { ...details, regions })

    expect(regionErrors([{ origin: 'CO', name: ' ' }])).toEqual({
      regions: 'Give the region a name',
    })
    expect(regionErrors([{ origin: 'CO', name: 'x'.repeat(61) }])).toEqual({
      regions: 'Keep each region to 60 characters or fewer',
    })
    expect(regionErrors([{ origin: 'ET', name: 'Guji' }])).toEqual({
      regions: "Pick regions from the coffee's own origins",
    })
    expect(regionErrors('Huila')).toEqual({
      regions: 'Pick regions from the list',
    })
  })
})

describe('regionSearchSchema', () => {
  it('reads the origins as known country codes', () => {
    expect(
      regionSearchSchema.parse({ search: 'hui', origins: 'CO,xx,ET' }),
    ).toEqual({ search: 'hui', origins: ['CO', 'ET'] })
    expect(regionSearchSchema.parse({})).toEqual({ search: '', origins: [] })
  })
})

describe('newShelfSchema', () => {
  it('explains a missing or long name', () => {
    expect(errorsOf(newShelfSchema, { name: ' ' })).toEqual({
      name: 'Give the shelf a name',
    })
    expect(errorsOf(newShelfSchema, { name: 'x'.repeat(41) })).toEqual({
      name: 'Keep the name to 40 characters or fewer',
    })
  })
})

describe('inviteEmailSchema', () => {
  it('lowercases a valid email', () => {
    expect(inviteEmailSchema.parse({ email: ' Sarah@Example.com ' })).toEqual({
      email: 'sarah@example.com',
    })
  })

  it('explains an invalid email', () => {
    expect(errorsOf(inviteEmailSchema, { email: 'not an email' })).toEqual({
      email: 'Enter a valid email',
    })
  })
})
