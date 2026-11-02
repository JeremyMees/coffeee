import { z } from 'zod'
import { roastedForOptions, roastLevels } from './coffee'
import { bagColours } from './colours'
import { isOriginCode } from './origins'

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

export const regionSearchSchema = listSearchSchema.extend({
  origins: z
    .string({ error: 'Pick origins as a list of country codes' })
    .default('')
    .transform(codes => codes.split(',').filter(isOriginCode)),
})

export const inviteEmailSchema = z.object({
  email: z
    .string({ error: 'Enter a valid email' })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: 'Enter a valid email' })),
})

const coffeeDetailsShape = {
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
  origins: z
    .array(z.string(), { error: 'Pick where it was grown' })
    .min(1, 'Pick where it was grown')
    .max(10, 'Pick 10 origins or fewer')
    .refine(codes => codes.every(isOriginCode), 'Pick countries from the list')
    .transform(codes => [...new Set(codes)]),
  regions: z
    .array(z.object({ origin: z.string(), name: z.string().trim() }), {
      error: 'Pick regions from the list',
    })
    .max(20, 'Pick 20 regions or fewer')
    .refine(
      regions => regions.every(region => region.name.length > 0),
      'Give the region a name',
    )
    .refine(
      regions => regions.every(region => region.name.length <= 60),
      'Keep each region to 60 characters or fewer',
    )
    .default([]),
  altitudeFrom: altitude('lowest'),
  altitudeTo: altitude('highest'),
}

function altitude(end: string) {
  return z.preprocess(
    numberFromForm,
    z
      .number({ error: `Enter the ${end} altitude in metres` })
      .int(`Enter the ${end} altitude in whole metres`)
      .nonnegative("The altitude can't be below sea level")
      .max(6000, 'Keep the altitude to 6000 m or less')
      .nullable(),
  )
}

interface DescribedCoffee {
  origins: string[]
  regions: { origin: string; name: string }[]
  altitudeFrom: number | null
  altitudeTo: number | null
}

function validFields(...fields: string[]) {
  return (payload: z.core.ParsePayload) =>
    payload.issues.every(issue => !fields.includes(String(issue.path?.[0])))
}

function describedCoffee<Coffee extends z.ZodType<DescribedCoffee>>(
  coffee: Coffee,
) {
  return coffee
    .refine(
      ({ origins, regions }) =>
        regions.every(region => origins.includes(region.origin)),
      {
        path: ['regions'],
        message: "Pick regions from the coffee's own origins",
        when: validFields('origins', 'regions'),
      },
    )
    .refine(
      ({ altitudeFrom, altitudeTo }) =>
        altitudeFrom === null ||
        altitudeTo === null ||
        altitudeFrom <= altitudeTo,
      {
        path: ['altitudeTo'],
        message: "The highest altitude can't be below the lowest",
        when: validFields('altitudeFrom', 'altitudeTo'),
      },
    )
    .transform(described => ({
      ...described,
      altitudeFrom: described.altitudeFrom ?? described.altitudeTo,
      altitudeTo: described.altitudeTo ?? described.altitudeFrom,
    }))
}

export const coffeeDetailsSchema = describedCoffee(z.object(coffeeDetailsShape))

export const newCoffeeSchema = describedCoffee(
  z.object({
    ...coffeeDetailsShape,
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
  }),
)

export type CoffeeDetails = z.output<typeof coffeeDetailsSchema>
export type NewCoffee = z.output<typeof newCoffeeSchema>
