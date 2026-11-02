import { and, eq } from 'drizzle-orm'
import type { VerdictChange } from '#shared/types/verdicts'
import type { Database } from '#server/types/database'
import { coffee, coffeeVerdict } from '#server/db/schemas'

export const verdictColumns = {
  rating: coffeeVerdict.rating,
  wouldBuyAgain: coffeeVerdict.wouldBuyAgain,
}

export function verdictOn(shelfId: string) {
  return and(
    eq(coffeeVerdict.shelfId, shelfId),
    eq(coffeeVerdict.coffeeId, coffee.id),
  )
}

export async function findVerdict(
  db: Database,
  input: { shelfId: string; coffeeId: string },
) {
  const [found] = await db
    .select(verdictColumns)
    .from(coffeeVerdict)
    .where(
      and(
        eq(coffeeVerdict.shelfId, input.shelfId),
        eq(coffeeVerdict.coffeeId, input.coffeeId),
      ),
    )

  return found ?? { rating: null, wouldBuyAgain: false }
}

export async function judgeCoffee(
  db: Database,
  input: {
    shelfId: string
    coffeeId: string
    userId: string
    verdict: VerdictChange
  },
) {
  const [found] = await db
    .select({ id: coffee.id })
    .from(coffee)
    .where(eq(coffee.id, input.coffeeId))

  if (!found) return undefined

  const change = {
    ...(input.verdict.rating !== undefined && { rating: input.verdict.rating }),
    ...(input.verdict.wouldBuyAgain !== undefined && {
      wouldBuyAgain: input.verdict.wouldBuyAgain,
    }),
    updatedBy: input.userId,
    updatedAt: new Date(),
  }

  const [judged] = await db
    .insert(coffeeVerdict)
    .values({ shelfId: input.shelfId, coffeeId: input.coffeeId, ...change })
    .onConflictDoUpdate({
      target: [coffeeVerdict.shelfId, coffeeVerdict.coffeeId],
      set: change,
    })
    .returning(verdictColumns)

  return judged!
}
