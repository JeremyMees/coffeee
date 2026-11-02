import type { InferSelectModel } from 'drizzle-orm'
import type { z } from 'zod'
import type { purchase } from '#server/db/schemas'
import type { purchaseSchema } from '../utils/schemas'

export type Purchase = InferSelectModel<typeof purchase>

export type PurchaseRecord = Pick<
  Purchase,
  'purchasedOn' | 'roastedOn' | 'sizeGrams' | 'priceCents'
>

export type NewPurchase = z.output<typeof purchaseSchema>
