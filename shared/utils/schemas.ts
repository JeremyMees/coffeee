import { z } from 'zod'
import { roastedForOptions, roastLevels } from './coffee'
import { bagColours } from './colours'
import { isOriginCode, originListFields } from './origins'
import type { DescribedCoffee } from '../types/coffee'
import type { OriginListField } from '../types/origins'
import type { ListNouns } from '../types/validation'

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

export const originListSearchSchema = listSearchSchema.extend({
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
  regions: originEntries(nouns('region'), 20, 60),
  farms: originEntries(nouns('farm'), 20, 80),
  washingStations: originEntries(nouns('washing station'), 20, 80),
  producers: listEntries(nouns('producer'), 20, 80),
  processes: requiredListEntries(
    nouns('process', 'processes'),
    10,
    60,
    'Pick how it was processed',
  ),
  varietals: listEntries(nouns('varietal'), 10, 60),
  flavorNotes: listEntries(nouns('flavor note'), 20, 40),
  link: z.preprocess(
    value => blankToNull(typeof value === 'string' ? value.trim() : value),
    z
      .url({
        protocol: /^https?$/,
        error: 'Enter a link that starts with https://',
      })
      .max(500, 'Keep the link to 500 characters or fewer')
      .nullable(),
  ),
  altitudeFrom: altitude('lowest'),
  altitudeTo: altitude('highest'),
}

function nouns(one: string, many = `${one}s`): ListNouns {
  return { one, many }
}

function namedEntries<Entry extends z.ZodType>(
  entry: Entry,
  nameOf: (entry: z.output<Entry>) => string,
  noun: ListNouns,
  max: number,
  maxLength: number,
  missing = `Pick ${noun.many} from the list`,
) {
  return z
    .array(entry, { error: missing })
    .max(max, `Pick ${max} ${noun.many} or fewer`)
    .refine(
      entries => entries.every(picked => nameOf(picked).length > 0),
      `Give the ${noun.one} a name`,
    )
    .refine(
      entries => entries.every(picked => nameOf(picked).length <= maxLength),
      `Keep each ${noun.one} to ${maxLength} characters or fewer`,
    )
}

function listEntries(noun: ListNouns, max: number, maxLength: number) {
  return namedEntries(
    z.string().trim(),
    name => name,
    noun,
    max,
    maxLength,
  ).default([])
}

function requiredListEntries(
  noun: ListNouns,
  max: number,
  maxLength: number,
  missing: string,
) {
  return namedEntries(
    z.string().trim(),
    name => name,
    noun,
    max,
    maxLength,
    missing,
  ).min(1, missing)
}

function originEntries(noun: ListNouns, max: number, maxLength: number) {
  return namedEntries(
    z.object({ origin: z.string(), name: z.string().trim() }),
    picked => picked.name,
    noun,
    max,
    maxLength,
  ).default([])
}

const originListNouns: Record<OriginListField, string> = {
  regions: 'regions',
  farms: 'farms',
  washingStations: 'washing stations',
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

function validFields(...fields: string[]) {
  return (payload: z.core.ParsePayload) =>
    payload.issues.every(issue => !fields.includes(String(issue.path?.[0])))
}

function describedCoffee<Coffee extends z.ZodType<DescribedCoffee>>(
  coffee: Coffee,
) {
  const fromOwnOrigins = originListFields.reduce(
    (checked, field) =>
      checked.refine(
        described =>
          described[field].every(picked =>
            described.origins.includes(picked.origin),
          ),
        {
          path: [field],
          message: `Pick ${originListNouns[field]} from the coffee's own origins`,
          when: validFields('origins', field),
        },
      ),
    coffee as z.ZodType<DescribedCoffee>,
  ) as Coffee

  return fromOwnOrigins
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

const purchaseShape = {
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
}

export const purchaseSchema = z.object(purchaseShape)

export const newCoffeeSchema = describedCoffee(
  z.object({ ...coffeeDetailsShape, ...purchaseShape }),
)

export const verdictSchema = z
  .object({
    rating: z
      .number({ error: 'Rate it from 1 to 5 stars' })
      .int('Rate it in whole stars')
      .min(1, 'Rate it from 1 to 5 stars')
      .max(5, 'Rate it from 1 to 5 stars')
      .nullable()
      .optional(),
    wouldBuyAgain: z
      .boolean({ error: 'Say yes or no to buying it again' })
      .optional(),
  })
  .refine(
    change => change.rating !== undefined || change.wouldBuyAgain !== undefined,
    'Change the rating or whether you would buy it again',
  )
