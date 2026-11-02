import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CoffeeVerdict from '~/components/CoffeeVerdict.vue'
import type { Verdict } from '#imports'
import { api, fakeApi, resetApi } from '../fake-api'
import { tid } from '../fixtures'

fakeApi()

beforeEach(resetApi)

function mountVerdict(
  verdict: Verdict = { rating: null, wouldBuyAgain: false },
) {
  return mountSuspended(CoffeeVerdict, {
    props: { shelfId: 'home', coffeeId: 'c1', verdict },
  })
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

    await vi.waitFor(() => expect(api.verdicts).toEqual([{ rating: 4 }]))
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

    await vi.waitFor(() => expect(api.verdicts).toEqual([{ rating: null }]))
  })

  it('toggles would buy again', async () => {
    const verdict = await mountVerdict({ rating: 2, wouldBuyAgain: true })

    await verdict.get(tid('verdict-buy-again')).trigger('click')

    await vi.waitFor(() =>
      expect(api.verdicts).toEqual([{ wouldBuyAgain: false }]),
    )
  })

  it('marks a favourite', async () => {
    const verdict = await mountVerdict({ rating: 5, wouldBuyAgain: true })

    expect(verdict.get(tid('verdict-rating')).text()).toBe('5 stars')
    expect(verdict.get(tid('verdict-favourite')).text()).toBe('Favourite')
  })

  it('says why the verdict could not be saved', async () => {
    api.verdictFails = true
    const verdict = await mountVerdict()

    await verdict.get(tid('verdict-star-2')).trigger('click')

    await vi.waitFor(() =>
      expect(verdict.get(tid('verdict-error')).text()).toBe(
        'The verdict could not be saved',
      ),
    )
  })
})
