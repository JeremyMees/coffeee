import { describe, expect, it } from 'vitest'
import type { z } from 'zod'
import {
  coffeeDetailsSchema,
  inviteEmailSchema,
  newCoffeeSchema,
  originListSearchSchema,
  newShelfSchema,
  purchaseSchema,
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
  processes: ['Washed'],
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
      farms: [],
      washingStations: [],
      producers: [],
      varietals: [],
      flavorNotes: [],
      link: null,
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
      processes: 'Pick how it was processed',
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

describe('purchaseSchema', () => {
  it('reads a purchase from the form', () => {
    expect(
      purchaseSchema.parse({
        purchasedOn: '2026-11-02',
        roastedOn: '',
        sizeGrams: '250',
        price: '16.50',
      }),
    ).toEqual({
      purchasedOn: '2026-11-02',
      roastedOn: null,
      sizeGrams: 250,
      price: 16.5,
    })
  })

  it('explains a missing purchase date', () => {
    expect(errorsOf(purchaseSchema, { roastedOn: null })).toEqual({
      purchasedOn: 'Enter the date you bought it',
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
    processes: ['Washed'],
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

  it('explains farms and washing stations that make no sense', () => {
    expect(
      errorsOf(coffeeDetailsSchema, {
        ...details,
        farms: [{ origin: 'CO', name: 'x'.repeat(81) }],
        washingStations: [{ origin: 'ET', name: 'Hambela' }],
      }),
    ).toEqual({
      farms: 'Keep each farm to 80 characters or fewer',
      washingStations: "Pick washing stations from the coffee's own origins",
    })
    expect(
      errorsOf(coffeeDetailsSchema, {
        ...details,
        farms: [{ origin: 'ET', name: 'Buku Abel' }],
        washingStations: [{ origin: 'CO', name: ' ' }],
      }),
    ).toEqual({
      farms: "Pick farms from the coffee's own origins",
      washingStations: 'Give the washing station a name',
    })
  })

  it('trims producer names', () => {
    expect(
      coffeeDetailsSchema.parse({ ...details, producers: [' Nestor Lasso '] })
        .producers,
    ).toEqual(['Nestor Lasso'])
  })

  it('explains producers that make no sense', () => {
    const producerErrors = (producers: unknown) =>
      errorsOf(coffeeDetailsSchema, { ...details, producers })

    expect(producerErrors([' '])).toEqual({
      producers: 'Give the producer a name',
    })
    expect(producerErrors(['x'.repeat(81)])).toEqual({
      producers: 'Keep each producer to 80 characters or fewer',
    })
    expect(
      producerErrors(Array.from({ length: 21 }, (_, i) => `P${i}`)),
    ).toEqual({ producers: 'Pick 20 producers or fewer' })
    expect(producerErrors('Nestor Lasso')).toEqual({
      producers: 'Pick producers from the list',
    })
  })
})

describe('how a coffee was made', () => {
  const details = {
    name: 'Pink Bourbon',
    roaster: 'Square Mile',
    roastLevel: 'light',
    roastedFor: 'filter',
    colour: '#e4572e',
    origins: ['CO'],
    processes: [' Washed '],
  }

  it('trims process and varietal names', () => {
    expect(
      coffeeDetailsSchema.parse({ ...details, varietals: [' Geisha '] }),
    ).toMatchObject({ processes: ['Washed'], varietals: ['Geisha'] })
  })

  it('explains processes that make no sense', () => {
    const processErrors = (processes: unknown) =>
      errorsOf(coffeeDetailsSchema, { ...details, processes })

    expect(processErrors([])).toEqual({
      processes: 'Pick how it was processed',
    })
    expect(processErrors('Washed')).toEqual({
      processes: 'Pick how it was processed',
    })
    expect(
      processErrors(Array.from({ length: 11 }, (_, i) => `P${i}`)),
    ).toEqual({ processes: 'Pick 10 processes or fewer' })
    expect(processErrors(['x'.repeat(61)])).toEqual({
      processes: 'Keep each process to 60 characters or fewer',
    })
  })

  it('trims flavor notes and explains ones that make no sense', () => {
    expect(
      coffeeDetailsSchema.parse({ ...details, flavorNotes: [' Lime '] })
        .flavorNotes,
    ).toEqual(['Lime'])
    expect(
      errorsOf(coffeeDetailsSchema, {
        ...details,
        flavorNotes: ['x'.repeat(41)],
      }),
    ).toEqual({
      flavorNotes: 'Keep each flavor note to 40 characters or fewer',
    })
    expect(
      errorsOf(coffeeDetailsSchema, { ...details, flavorNotes: 'Lime' }),
    ).toEqual({ flavorNotes: 'Pick flavor notes from the list' })
  })

  it('takes a blank link as none', () => {
    expect(coffeeDetailsSchema.parse({ ...details, link: '  ' }).link).toBe(
      null,
    )
    expect(
      coffeeDetailsSchema.parse({ ...details, link: ' https://a.coffee/x ' })
        .link,
    ).toBe('https://a.coffee/x')
  })

  it('only takes web links', () => {
    const linkErrors = (link: unknown) =>
      errorsOf(coffeeDetailsSchema, { ...details, link })

    for (const link of ['example.com', 'ftp://example.com', 'javascript:x']) {
      expect(linkErrors(link)).toEqual({
        link: 'Enter a link that starts with https://',
      })
    }
    expect(linkErrors(`https://a.coffee/${'x'.repeat(500)}`)).toEqual({
      link: 'Keep the link to 500 characters or fewer',
    })
  })
})

describe('originListSearchSchema', () => {
  it('reads the origins as known country codes', () => {
    expect(
      originListSearchSchema.parse({ search: 'hui', origins: 'CO,xx,ET' }),
    ).toEqual({ search: 'hui', origins: ['CO', 'ET'] })
    expect(originListSearchSchema.parse({})).toEqual({
      search: '',
      origins: [],
    })
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
