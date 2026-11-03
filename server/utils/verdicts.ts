import { and, count, desc, eq, isNotNull, or, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { VerdictChange } from '#shared/types/verdicts'
import type { Database } from '#server/types/database'
import { coffee, coffeeVerdict, user } from '#server/db/schemas'

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

const raterVerdict = alias(coffeeVerdict, 'raterVerdict')

const ratedCoffee = sql`from ${coffeeVerdict} as ${sql.identifier('raterVerdict')}
  where ${raterVerdict.coffeeId} = ${coffee.id}`

export const communityRatingColumns = {
  average: sql<
    number | null
  >`(select cast(avg(${raterVerdict.rating}) as double precision) ${ratedCoffee})`,
  raters: sql<number>`(select cast(count(${raterVerdict.rating}) as integer) ${ratedCoffee})`,
}

export function byCommunityRating() {
  return [
    sql`${communityRatingColumns.average} desc nulls last`,
    sql`${communityRatingColumns.raters} desc`,
  ]
}

const judged = or(
  isNotNull(coffeeVerdict.rating),
  eq(coffeeVerdict.wouldBuyAgain, true),
)

export async function communityRatingOf(db: Database, coffeeId: string) {
  const [rated] = await db
    .select({
      average: sql<
        number | null
      >`cast(avg(${coffeeVerdict.rating}) as double precision)`,
      raters: count(coffeeVerdict.rating),
      wouldBuyAgain: sql<number>`cast(count(*) filter (where ${coffeeVerdict.wouldBuyAgain}) as integer)`,
    })
    .from(coffeeVerdict)
    .where(eq(coffeeVerdict.coffeeId, coffeeId))

  return rated!
}

export function reviewsOf(
  db: Database,
  input: { coffeeId: string; userId: string },
) {
  const mine = sql<boolean>`${coffeeVerdict.userId} = ${input.userId}`

  return db
    .select({
      userId: user.id,
      name: user.name,
      ...verdictColumns,
      updatedAt: coffeeVerdict.updatedAt,
      mine,
    })
    .from(coffeeVerdict)
    .innerJoin(user, eq(user.id, coffeeVerdict.userId))
    .where(and(eq(coffeeVerdict.coffeeId, input.coffeeId), judged))
    .orderBy(desc(mine), desc(coffeeVerdict.updatedAt), desc(user.id))
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
