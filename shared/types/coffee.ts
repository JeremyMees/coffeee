import type {
  descriptionListFields,
  roastedForOptions,
  roastLevels,
} from '../utils/coffee'
import type { z } from 'zod/mini'
import type {
  coffeeDetailsSchema,
  coffeeMatchSchema,
  newCoffeeSchema,
} from '../utils/schemas'
import type { OriginEntry } from './catalog'
import type { OriginListField } from './origins'

export type RoastLevel = (typeof roastLevels)[number]

export type RoastedFor = (typeof roastedForOptions)[number]

export type DescriptionListField = (typeof descriptionListFields)[number]

export type DescribedCoffee = Record<OriginListField, OriginEntry[]> & {
  origins: string[]
  altitudeFrom: number | null
  altitudeTo: number | null
}

export type CoffeeDetails = z.output<typeof coffeeDetailsSchema>

export type NewCoffee = z.output<typeof newCoffeeSchema>

export type CoffeeMatchSearch = z.output<typeof coffeeMatchSchema>

export type CoffeeDescription = Pick<
  CoffeeDetails,
  'origins' | DescriptionListField
>
