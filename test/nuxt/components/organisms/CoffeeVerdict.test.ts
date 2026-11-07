import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { and, eq } from 'drizzle-orm'
import CoffeeVerdict from '~/components/organisms/CoffeeVerdict.vue'
import type { Verdict } from '#imports'
import { coffeeVerdict } from '#server/db/schemas'
import type { Member } from '#test/support/types'
import { tid } from '../../fixtures'
import { database, failRequest, scenario, signIn } from '../../server'

let sarah: Member
let coffeeId: string

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  coffeeId = (await scenario.coffee(sarah.shelf)).id
  await signIn(sarah)
})

async function judged(verdict: Verdict) {
  if (verdict.rating !== null) {
    await scenario.verdict(sarah, coffeeId, { rating: verdict.rating })
  }
  if (verdict.wouldBuyAgain) {
    await scenario.verdict(sarah, coffeeId, { wouldBuyAgain: true })
  }
}

async function mountVerdict(
  verdict: Verdict = { rating: null, wouldBuyAgain: false },
) {
  await judged(verdict)

  return mountSuspended(CoffeeVerdict, {
    props: { coffeeId, verdict },
  })
}

async function storedVerdict() {
  const db = await database()
  const [stored] = await db
    .select({
      rating: coffeeVerdict.rating,
      wouldBuyAgain: coffeeVerdict.wouldBuyAgain,
    })
    .from(coffeeVerdict)
    .where(
      and(
        eq(coffeeVerdict.userId, sarah.id),
        eq(coffeeVerdict.coffeeId, coffeeId),
      ),
    )

  return stored
}

describe('CoffeeVerdict', () => {
  it('says the coffee is not yet rated or to be bought again', async () => {
    const verdict = await mountVerdict()

    expect(verdict.get(tid('verdict-rating')).text()).toBe('Not yet rated')
    expect(
      verdict.get(tid('verdict-buy-again')).attributes('aria-pressed'),
    ).toBe('false')
    expect(verdict.find(tid('verdict-favourite')).exists()).toBe(false)
  })

  it('rates the coffee with a star', async () => {
    const verdict = await mountVerdict()

    await verdict.get(tid('verdict-star-4')).trigger('click')

    await vi.waitFor(async () =>
      expect(await storedVerdict()).toEqual({
        rating: 4,
        wouldBuyAgain: false,
      }),
    )
  })

  it('clears the rating with the star it already has', async () => {
    const verdict = await mountVerdict({ rating: 4, wouldBuyAgain: false })

    expect(verdict.get(tid('verdict-star-4')).attributes('aria-pressed')).toBe(
      'true',
    )
    expect(verdict.get(tid('verdict-star-4')).attributes('aria-label')).toBe(
      'Clear the 4 stars rating',
    )

    await verdict.get(tid('verdict-star-4')).trigger('click')

    await vi.waitFor(async () =>
      expect((await storedVerdict())?.rating ?? null).toBeNull(),
    )
  })

  it('toggles would buy again', async () => {
    const verdict = await mountVerdict({ rating: 2, wouldBuyAgain: true })

    await verdict.get(tid('verdict-buy-again')).trigger('click')

    await vi.waitFor(async () =>
      expect(await storedVerdict()).toEqual({
        rating: 2,
        wouldBuyAgain: false,
      }),
    )
  })

  it('shows a cross when it would not be bought again', async () => {
    const verdict = await mountVerdict({ rating: null, wouldBuyAgain: false })

    expect(verdict.find(tid('verdict-buy-again-no')).exists()).toBe(true)
    expect(verdict.find(tid('verdict-buy-again-yes')).exists()).toBe(false)
  })

  it('shows a check when it would be bought again', async () => {
    const verdict = await mountVerdict({ rating: null, wouldBuyAgain: true })

    expect(verdict.find(tid('verdict-buy-again-yes')).exists()).toBe(true)
    expect(verdict.find(tid('verdict-buy-again-no')).exists()).toBe(false)
  })

  it('marks a favourite', async () => {
    const verdict = await mountVerdict({ rating: 5, wouldBuyAgain: true })

    expect(verdict.get(tid('verdict-rating')).text()).toBe('5 stars')
    expect(verdict.get(tid('verdict-favourite')).text()).toBe('Favourite')
  })

  it('says why the verdict could not be saved', async () => {
    failRequest('PATCH', `/api/coffees/${coffeeId}/verdict`, {
      status: 500,
      message: 'The verdict could not be saved',
    })
    const verdict = await mountVerdict()

    await verdict.get(tid('verdict-star-2')).trigger('click')

    await vi.waitFor(() =>
      expect(verdict.get(tid('verdict-error')).text()).toBe(
        'The verdict could not be saved',
      ),
    )
    expect(await storedVerdict()).toBeUndefined()
  })
})
