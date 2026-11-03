import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ProfileStats from '~/components/ProfileStats.vue'
import { api, fakeApi, resetApi } from '../fake-api'
import { tid } from '../fixtures'

fakeApi()

beforeEach(resetApi)

async function stats() {
  const wrapper = await mountSuspended(ProfileStats)

  return (key: string) => wrapper.get(tid(`stats-${key}`)).text()
}

describe('ProfileStats', () => {
  it('sums up what they bought and rated', async () => {
    const value = await stats()

    expect(value('bags')).toBe('12')
    expect(value('weight')).toBe('3 kg')
    expect(value('spent')).toMatch(/^€\s?198\.00$/)
    expect(value('rated')).toBe('9')
    expect(value('average-rating')).toBe('4.2 stars')
    expect(value('buy-again')).toBe('5')
    expect(value('top-roaster')).toBe('Square Mile')
  })

  it('says when there is nothing to sum up yet', async () => {
    api.profileStats = {
      bags: 0,
      grams: 0,
      spentCents: 0,
      rated: 0,
      averageRating: null,
      wouldBuyAgain: 0,
      topRoaster: null,
    }

    const value = await stats()

    expect(value('weight')).toBe('0 g')
    expect(value('average-rating')).toBe('None yet')
    expect(value('top-roaster')).toBe('None yet')
  })
})
