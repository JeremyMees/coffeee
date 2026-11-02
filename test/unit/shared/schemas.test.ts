import { describe, expect, it } from 'vitest'
import type { z } from 'zod'
import {
  inviteEmailSchema,
  newCoffeeSchema,
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
  purchasedOn: '2026-11-02',
  roastedOn: null,
  sizeGrams: null,
  price: null,
}

describe('newCoffeeSchema', () => {
  it('accepts a coffee with only the required details', () => {
    expect(newCoffeeSchema.parse(coffee)).toEqual(coffee)
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
