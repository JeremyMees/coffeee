import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ProfileStats from '~/components/organisms/ProfileStats.vue'
import type { Member } from '#test/support/types'
import { tid } from '../../fixtures'
import { scenario, signIn } from '../../server'

let sarah: Member

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  await signIn(sarah)
})

async function stats() {
  const wrapper = await mountSuspended(ProfileStats)

  return (key: string) => wrapper.get(tid(`stats-${key}`)).text()
}

describe('ProfileStats', () => {
  it('sums up what they bought and rated', async () => {
    const ayele = await scenario.coffee(sarah.shelf, {
      sizeGrams: 1000,
      price: 40,
    })
    await scenario.bag(sarah.shelf, ayele.id, { sizeGrams: 1000, price: 42 })
    const kamwangi = await scenario.coffee(sarah.shelf, {
      name: 'Kamwangi',
      roaster: 'La Cabra',
      sizeGrams: 1000,
      price: 116,
    })
    await scenario.verdict(sarah, ayele.id, {
      rating: 4,
      wouldBuyAgain: true,
    })
    await scenario.verdict(sarah, kamwangi.id, { rating: 5 })

    const value = await stats()

    expect(value('bags')).toBe('3')
    expect(value('weight')).toBe('3 kg')
    expect(value('spent')).toMatch(/^€\s?198\.00$/)
    expect(value('rated')).toBe('2')
    expect(value('average-rating')).toBe('4.5 stars')
    expect(value('buy-again')).toBe('1')
    expect(value('top-roaster')).toBe('Square Mile')
  })

  it('says when there is nothing to sum up yet', async () => {
    const value = await stats()

    expect(value('bags')).toBe('0')
    expect(value('weight')).toBe('0 g')
    expect(value('average-rating')).toBe('None yet')
    expect(value('top-roaster')).toBe('None yet')
  })
})
