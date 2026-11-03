import type { InferSelectModel } from 'drizzle-orm'
import type { z } from 'zod'
import type { coffeeVerdict } from '#server/db/schemas'
import type { verdictSchema } from '../utils/schemas'
import type { ratings } from '../utils/verdicts'

export type UserVerdict = InferSelectModel<typeof coffeeVerdict>

export type Verdict = Pick<UserVerdict, 'rating' | 'wouldBuyAgain'>

export interface CommunityRating {
  average: number | null
  raters: number
}

export type Rating = (typeof ratings)[number]

export type VerdictChange = z.output<typeof verdictSchema>
