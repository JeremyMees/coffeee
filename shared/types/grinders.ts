import type { InferSelectModel } from 'drizzle-orm'
import type { z } from 'zod'
import type { brewMethod, grinder, grindSetting } from '#server/db/schemas'
import type {
  grindSettingSchema,
  newBrewMethodSchema,
  newGrinderSchema,
} from '../utils/schemas'

export type Grinder = InferSelectModel<typeof grinder>

export type BrewMethod = InferSelectModel<typeof brewMethod>

export type GrindSetting = InferSelectModel<typeof grindSetting>

export type NewGrinder = z.output<typeof newGrinderSchema>

export type NewBrewMethod = z.output<typeof newBrewMethodSchema>

export type GrindSettingChange = z.output<typeof grindSettingSchema>
