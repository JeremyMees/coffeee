import { and, asc, eq, isNotNull, ne, or } from 'drizzle-orm'
import type { VerdictChange } from '#shared/types/verdicts'
import type { Database } from '#server/types/database'
import { coffee, coffeeVerdict, shelfMember, user } from '#server/db/schemas'

export const verdictColumns = {
  rating: coffeeVerdict.rating,
  wouldBuyAgain: coffeeVerdict.wouldBuyAgain,
}

export function verdictOn(userId: string) {
  return and(
    eq(coffeeVerdict.userId, userId),
    eq(coffeeVerdict.coffeeId, coffee.id),
  )
}

export async function findVerdict(
  db: Database,
  input: { userId: string; coffeeId: string },
) {
  const [found] = await db
    .select(verdictColumns)
    .from(coffeeVerdict)
    .where(
      and(
        eq(coffeeVerdict.userId, input.userId),
        eq(coffeeVerdict.coffeeId, input.coffeeId),
      ),
    )

  return found ?? { rating: null, wouldBuyAgain: false }
}

export function memberVerdictsOf(
  db: Database,
  input: { shelfId: string; coffeeId: string; userId: string },
) {
  return db
    .select({ userId: user.id, name: user.name, ...verdictColumns })
    .from(coffeeVerdict)
    .innerJoin(
      shelfMember,
      and(
        eq(shelfMember.userId, coffeeVerdict.userId),
        eq(shelfMember.shelfId, input.shelfId),
      ),
    )
    .innerJoin(user, eq(user.id, coffeeVerdict.userId))
    .where(
      and(
        eq(coffeeVerdict.coffeeId, input.coffeeId),
        ne(coffeeVerdict.userId, input.userId),
        or(
          isNotNull(coffeeVerdict.rating),
          eq(coffeeVerdict.wouldBuyAgain, true),
        ),
      ),
    )
    .orderBy(asc(user.name))
}

export async function judgeCoffee(
  db: Database,
  input: {
    userId: string
    coffeeId: string
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
    updatedAt: new Date(),
  }

  const [judged] = await db
    .insert(coffeeVerdict)
    .values({ userId: input.userId, coffeeId: input.coffeeId, ...change })
    .onConflictDoUpdate({
      target: [coffeeVerdict.userId, coffeeVerdict.coffeeId],
      set: change,
    })
    .returning(verdictColumns)

  return judged!
}
