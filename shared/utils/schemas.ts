import { z } from 'zod/mini'
import { adminListsPageSize } from './admin'
import { catalogPageSize, catalogSorts } from './catalog'
import { roastedForOptions, roastLevels } from './coffee'
import {
  librarySorts,
  libraryFilterPageSize,
  libraryPageSize,
  sortDirections,
} from './library'
import { notificationKinds, optionalEmailKinds } from './notifications'
import { isOriginCode, originListFields } from './origins'
import { roastersPageSize } from './roasters'
import type { DescribedCoffee } from '../types/coffee'
import type { OriginListField } from '../types/origins'
import type { FreezeDates } from '../types/purchases'
import type { ListNouns } from '../types/validation'

function blankToNull(value: unknown) {
  return value === '' || value === undefined ? null : value
}

function numberFromForm(value: unknown) {
  const filled = blankToNull(value)

  return typeof filled === 'string' ? Number(filled) : filled
}

function decimalFromForm(value: unknown) {
  const filled = blankToNull(value)

  return typeof filled === 'string'
    ? Number(filled.trim().replace(',', '.'))
    : filled
}

function preprocess<Schema extends z.ZodMiniType>(
  prepare: (value: unknown) => unknown,
  schema: Schema,
) {
  return z.pipe(z.transform(prepare), schema) as unknown as z.ZodMiniPipe<
    z.ZodMiniTransform<unknown, unknown>,
    Schema
  >
}

function requiredText(missing: string, max: number, tooLong: string) {
  return z
    .string({ error: missing })
    .check(z.trim(), z.minLength(1, missing), z.maxLength(max, tooLong))
}

function trimmedOrNull(value: unknown) {
  return blankToNull(typeof value === 'string' ? value.trim() : value)
}

function optionalLink(noun: string) {
  return preprocess(
    trimmedOrNull,
    z.nullable(
      z
        .url({
          protocol: /^https?$/,
          error: `Enter a ${noun} that starts with https://`,
        })
        .check(z.maxLength(500, `Keep the ${noun} to 500 characters or fewer`)),
    ),
  )
}

export const newShelfSchema = z.object({
  name: requiredText(
    'Give the shelf a name',
    40,
    'Keep the name to 40 characters or fewer',
  ),
})

export const shelfHandOverSchema = z.object({
  ownerId: z
    .string({ error: 'Choose who takes over the shelf' })
    .check(z.minLength(1, { error: 'Choose who takes over the shelf' })),
})

export const listSearchSchema = z.object({
  search: z._default(
    z
      .string({ error: 'Search with a single piece of text' })
      .check(z.maxLength(80, 'Keep the search to 80 characters or fewer')),
    '',
  ),
})

function pageNumber() {
  return z._default(
    z.coerce
      .number({ error: 'Ask for a page by its number' })
      .check(
        z.int('Ask for a page by its number'),
        z.minimum(0, 'Ask for a page by its number'),
      ),
    0,
  )
}

function optionalId(noun: string) {
  return z._default(
    z
      .string({ error: `Pick a ${noun} as a single piece of text` })
      .check(z.maxLength(100, `Pick a ${noun} by its id`)),
    '',
  )
}

const pickLimit = 20

function picks<Item extends z.ZodMiniType>(item: Item, noun: string) {
  return preprocess(
    value =>
      (Array.isArray(value)
        ? value
        : value === undefined
          ? []
          : [value]
      ).filter(picked => picked !== ''),
    z
      .array(item)
      .check(
        z.maxLength(pickLimit, `Pick at most ${pickLimit} ${noun}s at a time`),
      ),
  )
}

function ids(noun: string) {
  return picks(
    z
      .string({ error: `Pick each ${noun} as a piece of text` })
      .check(z.maxLength(100, `Pick each ${noun} by its id`)),
    noun,
  )
}

function yesOrNo(noun: string) {
  return z.pipe(
    z._default(
      z.enum(['true', 'false'], { error: `Say true or false for ${noun}` }),
      'false',
    ),
    z.transform(value => value === 'true'),
  )
}

function pageSize(noun: string, fallback: number) {
  return z._default(
    z.coerce
      .number({ error: 'Ask for a page size as a number' })
      .check(
        z.int('Ask for a page size as a whole number'),
        z.minimum(1, `Ask for at least one ${noun}`),
        z.maximum(100, `Ask for at most 100 ${noun}s at a time`),
      ),
    fallback,
  )
}

export const browsingSearchSchema = z.extend(listSearchSchema, {
  roasterId: ids('roaster'),
  flavorNoteId: ids('flavor note'),
  originCode: ids('origin'),
  processId: ids('process'),
  varietalId: ids('varietal'),
  roastLevel: picks(
    z.enum(roastLevels, { error: 'Pick one of the roast levels' }),
    'roast level',
  ),
  roastedFor: picks(
    z.enum(roastedForOptions, { error: 'Pick espresso, filter or omni' }),
    'brew style',
  ),
  page: pageNumber(),
})

export const librarySearchSchema = z.extend(browsingSearchSchema, {
  bought: yesOrNo('bought'),
  favourites: yesOrNo('favourites'),
  sort: z.optional(
    z.enum(librarySorts, { error: 'Sort by one of the library columns' }),
  ),
  direction: z._default(
    z.enum(sortDirections, { error: 'Sort ascending or descending' }),
    'ascending',
  ),
  pageSize: pageSize('coffee', libraryPageSize),
})

export const catalogSearchSchema = z.extend(browsingSearchSchema, {
  mine: yesOrNo('mine'),
  sort: z._default(
    z.enum(catalogSorts, { error: 'Sort by newest or community rating' }),
    'newest',
  ),
  pageSize: pageSize('coffee', catalogPageSize),
})

export const filterLabelsSchema = z.object({
  roasterId: ids('roaster'),
  flavorNoteId: ids('flavor note'),
  originCode: ids('origin'),
  processId: ids('process'),
  varietalId: ids('varietal'),
})

export const roasterSearchSchema = z.extend(listSearchSchema, {
  boughtFrom: yesOrNo('bought from'),
  countryCode: ids('country'),
  page: pageNumber(),
  pageSize: pageSize('roaster', roastersPageSize),
})

export const libraryFilterSearchSchema = z.extend(listSearchSchema, {
  page: pageNumber(),
  pageSize: pageSize('option', libraryFilterPageSize),
})

export const originListSearchSchema = z.extend(listSearchSchema, {
  origins: z.pipe(
    z._default(
      z.string({ error: 'Pick origins as a list of country codes' }),
      '',
    ),
    z.transform(codes => codes.split(',').filter(isOriginCode)),
  ),
})

export const inviteEmailSchema = z.object({
  email: z.pipe(
    z.string({ error: 'Enter a valid email' }).check(z.trim(), z.toLowerCase()),
    z.email({ error: 'Enter a valid email' }),
  ),
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
  origins: z.pipe(
    z.array(z.string(), { error: 'Pick where it was grown' }).check(
      z.minLength(1, 'Pick where it was grown'),
      z.maxLength(10, 'Pick 10 origins or fewer'),
      z.refine(
        codes => codes.every(isOriginCode),
        'Pick countries from the list',
      ),
    ),
    z.transform(codes => [...new Set(codes)]),
  ),
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
  link: optionalLink('link'),
  altitudeFrom: altitude('lowest'),
  altitudeTo: altitude('highest'),
}

function nouns(one: string, many = `${one}s`): ListNouns {
  return { one, many }
}

function namedEntries<Entry extends z.ZodMiniType>(
  entry: Entry,
  nameOf: (entry: z.output<Entry>) => string,
  noun: ListNouns,
  max: number,
  maxLength: number,
  missing = `Pick ${noun.many} from the list`,
) {
  return z.array(entry, { error: missing }).check(
    z.maxLength(max, `Pick ${max} ${noun.many} or fewer`),
    z.refine(
      entries => entries.every(picked => nameOf(picked).length > 0),
      `Give the ${noun.one} a name`,
    ),
    z.refine(
      entries => entries.every(picked => nameOf(picked).length <= maxLength),
      `Keep each ${noun.one} to ${maxLength} characters or fewer`,
    ),
  )
}

function listEntries(noun: ListNouns, max: number, maxLength: number) {
  return z._default(
    namedEntries(
      z.string().check(z.trim()),
      name => name,
      noun,
      max,
      maxLength,
    ),
    [],
  )
}

function requiredListEntries(
  noun: ListNouns,
  max: number,
  maxLength: number,
  missing: string,
) {
  return namedEntries(
    z.string().check(z.trim()),
    name => name,
    noun,
    max,
    maxLength,
    missing,
  ).check(z.minLength(1, missing))
}

function originEntries(noun: ListNouns, max: number, maxLength: number) {
  return z._default(
    namedEntries(
      z.object({ origin: z.string(), name: z.string().check(z.trim()) }),
      picked => picked.name,
      noun,
      max,
      maxLength,
    ),
    [],
  )
}

const originListNouns: Record<OriginListField, string> = {
  regions: 'regions',
  farms: 'farms',
  washingStations: 'washing stations',
}

function altitude(end: string) {
  return preprocess(
    numberFromForm,
    z.nullable(
      z
        .number({ error: `Enter the ${end} altitude in metres` })
        .check(
          z.int(`Enter the ${end} altitude in whole metres`),
          z.nonnegative("The altitude can't be below sea level"),
          z.maximum(6000, 'Keep the altitude to 6000 m or less'),
        ),
    ),
  )
}

function validFields(...fields: string[]) {
  return (payload: z.core.ParsePayload) =>
    payload.issues.every(issue => !fields.includes(String(issue.path?.[0])))
}

function describedCoffee<Coffee extends z.ZodMiniType<DescribedCoffee>>(
  coffee: Coffee,
) {
  const fromOwnOrigins = coffee.check(
    ...originListFields.map(field =>
      z.refine<DescribedCoffee>(
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
    ),
    z.refine<DescribedCoffee>(
      ({ altitudeFrom, altitudeTo }) =>
        altitudeFrom === null ||
        altitudeTo === null ||
        altitudeFrom <= altitudeTo,
      {
        path: ['altitudeTo'],
        message: "The highest altitude can't be below the lowest",
        when: validFields('altitudeFrom', 'altitudeTo'),
      },
    ),
  ) as Coffee

  return z.pipe(
    fromOwnOrigins,
    z.transform((described: z.output<Coffee>) => withBothAltitudes(described)),
  )
}

function withBothAltitudes<Described extends DescribedCoffee>(
  described: Described,
): Described {
  return {
    ...described,
    altitudeFrom: described.altitudeFrom ?? described.altitudeTo,
    altitudeTo: described.altitudeTo ?? described.altitudeFrom,
  }
}

export const coffeeDetailsSchema = describedCoffee(z.object(coffeeDetailsShape))

export const coffeeMatchSchema = z.object({
  name: coffeeDetailsShape.name,
  roaster: coffeeDetailsShape.roaster,
})

const purchaseShape = {
  purchasedOn: z.iso.date({ error: 'Enter the date you bought it' }),
  roastedOn: preprocess(
    blankToNull,
    z.nullable(z.iso.date({ error: 'Enter the roast date as a date' })),
  ),
  frozenOn: preprocess(
    blankToNull,
    z.nullish(z.iso.date({ error: 'Enter the freeze date as a date' })),
  ),
  thawedOn: preprocess(
    blankToNull,
    z.nullish(z.iso.date({ error: 'Enter the thaw date as a date' })),
  ),
  sizeGrams: preprocess(
    numberFromForm,
    z.nullable(
      z
        .number({ error: 'Enter the size in grams' })
        .check(
          z.int('Enter the size in whole grams'),
          z.positive('The size has to be more than 0 g'),
          z.maximum(5000, 'Keep the size to 5000 g or less'),
        ),
    ),
  ),
  price: preprocess(
    decimalFromForm,
    z.nullable(
      z
        .number({ error: 'Enter the price as a number' })
        .check(
          z.nonnegative("The price can't be negative"),
          z.maximum(1000, 'Keep the price to 1000 or less'),
        ),
    ),
  ),
}

function freezable<Purchase extends z.ZodMiniType<FreezeDates>>(
  purchase: Purchase,
) {
  return purchase.check(
    z.refine<FreezeDates>(
      ({ roastedOn, frozenOn }) =>
        !roastedOn || !frozenOn || roastedOn <= frozenOn,
      {
        path: ['frozenOn'],
        message: "The freeze date can't be before the roast date",
        when: validFields('roastedOn', 'frozenOn'),
      },
    ),
    z.refine<FreezeDates>(
      ({ frozenOn, thawedOn }) => !thawedOn || Boolean(frozenOn),
      {
        path: ['thawedOn'],
        message: 'Add the freeze date before the thaw date',
        when: validFields('frozenOn', 'thawedOn'),
      },
    ),
    z.refine<FreezeDates>(
      ({ frozenOn, thawedOn }) =>
        !frozenOn || !thawedOn || frozenOn <= thawedOn,
      {
        path: ['thawedOn'],
        message: "The thaw date can't be before the freeze date",
        when: validFields('frozenOn', 'thawedOn'),
      },
    ),
  ) as Purchase
}

export const purchaseSchema = freezable(z.object(purchaseShape))

export const newCoffeeSchema = describedCoffee(
  freezable(z.object({ ...coffeeDetailsShape, ...purchaseShape })),
)

export const verdictSchema = z
  .object({
    rating: z.optional(
      z.nullable(
        z
          .number({ error: 'Rate it from 1 to 5 stars' })
          .check(
            z.int('Rate it in whole stars'),
            z.minimum(1, 'Rate it from 1 to 5 stars'),
            z.maximum(5, 'Rate it from 1 to 5 stars'),
          ),
      ),
    ),
    wouldBuyAgain: z.optional(
      z.boolean({ error: 'Say yes or no to buying it again' }),
    ),
  })
  .check(
    z.refine(
      change =>
        change.rating !== undefined || change.wouldBuyAgain !== undefined,
      'Change the rating or whether you would buy it again',
    ),
  )

export const newGrinderSchema = z.object({
  brand: requiredText(
    'Pick a brand or add a new one',
    60,
    'Keep the brand to 60 characters or fewer',
  ),
  model: requiredText(
    'Pick a model or add a new one',
    60,
    'Keep the model to 60 characters or fewer',
  ),
})

export const grinderModelSearchSchema = z.extend(listSearchSchema, {
  brand: z._default(
    z
      .string({ error: 'Pick a brand as a single piece of text' })
      .check(z.maxLength(60, 'Keep the brand to 60 characters or fewer')),
    '',
  ),
})

export const newBrewMethodSchema = z.object({
  name: requiredText(
    'Give the brew method a name',
    40,
    'Keep the name to 40 characters or fewer',
  ),
})

export const grindSettingSchema = z.object({
  grinderId: requiredText('Pick a grinder', 100, 'Pick a grinder'),
  brewMethodId: requiredText('Pick a brew method', 100, 'Pick a brew method'),
  setting: preprocess(
    trimmedOrNull,
    z.nullable(
      z
        .string({ error: 'Write the setting as text' })
        .check(z.maxLength(30, 'Keep the setting to 30 characters or fewer')),
    ),
  ),
})

export const roasterDetailsSchema = z.object({
  name: requiredText(
    'Give the roaster a name',
    80,
    'Keep the name to 80 characters or fewer',
  ),
  website: optionalLink('website'),
  countryCode: preprocess(
    blankToNull,
    z.nullable(
      z
        .string({ error: 'Pick a country from the list' })
        .check(z.refine(isOriginCode, 'Pick a country from the list')),
    ),
  ),
  city: preprocess(
    trimmedOrNull,
    z.nullable(
      z
        .string({ error: 'Enter the city as text' })
        .check(z.maxLength(80, 'Keep the city to 80 characters or fewer')),
    ),
  ),
})

export const adminEntrySearchSchema = z.extend(listSearchSchema, {
  except: optionalId('entry'),
  page: pageNumber(),
  pageSize: pageSize('entry', adminListsPageSize),
})

export const accountDeletionSchema = z.object({
  heirs: z._default(
    z.record(z.string(), z.string(), {
      error: 'Choose who takes over each shelf you own',
    }),
    {},
  ),
})

export const entryNameSchema = z.object({
  name: requiredText(
    'Give it a name',
    80,
    'Keep the name to 80 characters or fewer',
  ),
})

export const entryMergeSchema = z.object({
  intoId: requiredText(
    'Pick the entry to keep',
    100,
    'Pick the entry to keep by its id',
  ),
})

export const newOriginEntrySchema = z.extend(entryNameSchema, {
  originCode: z
    .string({ error: 'Pick a country from the list' })
    .check(z.refine(isOriginCode, 'Pick a country from the list')),
})

export const passwordMinLength = 8

const passwordSchema = z
  .string({ error: `Use at least ${passwordMinLength} characters` })
  .check(
    z.minLength(passwordMinLength, {
      error: `Use at least ${passwordMinLength} characters`,
    }),
    z.maxLength(128, { error: 'Use at most 128 characters' }),
  )

export const signInSchema = z.object({
  email: inviteEmailSchema.shape.email,
  password: z
    .string({ error: 'Enter your password' })
    .check(z.minLength(1, { error: 'Enter your password' })),
})

export const signUpSchema = z.object({
  name: z
    .string({ error: 'Enter your name' })
    .check(
      z.trim(),
      z.minLength(1, { error: 'Enter your name' }),
      z.maxLength(80, { error: 'Keep your name under 80 characters' }),
    ),
  email: inviteEmailSchema.shape.email,
  password: passwordSchema,
})

export const newPasswordSchema = z.object({ password: passwordSchema })

export const profileNameSchema = z.pick(signUpSchema, { name: true })

export const notificationEmailsSchema = z.object({
  emailed: z.array(z.enum(optionalEmailKinds)),
})

export const notificationPushesSchema = z.object({
  pushed: z.array(z.enum(notificationKinds)),
})

export const pushEndpointSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }),
})

export const pushSubscriptionSchema = z.extend(pushEndpointSchema, {
  keys: z.object({
    p256dh: z.string().check(z.minLength(1)),
    auth: z.string().check(z.minLength(1)),
  }),
})
