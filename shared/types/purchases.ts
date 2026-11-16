import type { InferSelectModel } from 'drizzle-orm'
import type { z } from 'zod'
import type { purchase } from '#server/db/schemas'
import type { purchaseSchema } from '../utils/schemas'

export type Purchase = InferSelectModel<typeof purchase>

export type PurchaseRecord = Pick<
  Purchase,
  | 'purchasedOn'
  | 'roastedOn'
  | 'frozenOn'
  | 'thawedOn'
  | 'sizeGrams'
  | 'priceCents'
>

export type FreezeDates = Partial<
  Pick<Purchase, 'roastedOn' | 'frozenOn' | 'thawedOn'>
>

export type RoastDates = FreezeDates & { roastedOn: string }

export type NewPurchase = z.output<typeof purchaseSchema>
