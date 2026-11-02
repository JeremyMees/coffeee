import { z } from 'zod'
import { roastedForOptions, roastLevels } from './coffee'
import { bagColours } from './colours'

function blankToNull(value: unknown) {
  return value === '' || value === undefined ? null : value
}

function numberFromForm(value: unknown) {
  const filled = blankToNull(value)

  return typeof filled === 'string' ? Number(filled) : filled
}

function requiredText(missing: string, max: number, tooLong: string) {
  return z.string({ error: missing }).trim().min(1, missing).max(max, tooLong)
}

export const newShelfSchema = z.object({
  name: requiredText(
    'Give the shelf a name',
    40,
    'Keep the name to 40 characters or fewer',
  ),
})

export const listSearchSchema = z.object({
  search: z
    .string({ error: 'Search with a single piece of text' })
    .max(80, 'Keep the search to 80 characters or fewer')
    .default(''),
})

export const inviteEmailSchema = z.object({
  email: z
    .string({ error: 'Enter a valid email' })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: 'Enter a valid email' })),
})

export const coffeeDetailsSchema = z.object({
  name: requiredText(
    'Give the coffee a name',
    80,
    'Keep the name to 80 characters or fewer',
  ),
  roaster: requiredText(
    'Pick a roaster or add a new one',
    80,
    'Keep the roaster to 80 characters or fewer',
  ),
  roastLevel: z.enum(roastLevels, { error: 'Pick a roast level' }),
  roastedFor: z.enum(roastedForOptions, {
    error: 'Pick what it was roasted for',
  }),
  colour: z.enum(bagColours, { error: 'Pick a colour' }),
})

export const newCoffeeSchema = coffeeDetailsSchema.extend({
  purchasedOn: z.iso.date({ error: 'Enter the date you bought it' }),
  roastedOn: z.preprocess(
    blankToNull,
    z.iso.date({ error: 'Enter the roast date as a date' }).nullable(),
  ),
  sizeGrams: z.preprocess(
    numberFromForm,
    z
      .number({ error: 'Enter the size in grams' })
      .int('Enter the size in whole grams')
      .positive('The size has to be more than 0 g')
      .max(5000, 'Keep the size to 5000 g or less')
      .nullable(),
  ),
  price: z.preprocess(
    numberFromForm,
    z
      .number({ error: 'Enter the price as a number' })
      .nonnegative("The price can't be negative")
      .max(1000, 'Keep the price to 1000 or less')
      .nullable(),
  ),
})

export type CoffeeDetails = z.output<typeof coffeeDetailsSchema>
export type NewCoffee = z.output<typeof newCoffeeSchema>
