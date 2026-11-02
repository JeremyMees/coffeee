import type { InferSelectModel } from 'drizzle-orm'
import type { z } from 'zod'
import type { roaster } from '#server/db/schemas'
import type { roasterDetailsSchema } from '../utils/schemas'

export type Roaster = InferSelectModel<typeof roaster>

export type RoasterDetails = z.output<typeof roasterDetailsSchema>
