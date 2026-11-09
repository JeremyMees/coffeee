import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ProfileStats from '~/components/organisms/ProfileStats.vue'
import type { Member } from '#test/support/types'
import { tid } from '../../fixtures'
import { failRequest, holdRequest, scenario, signIn } from '../../server'

let sarah: Member

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  await signIn(sarah)
})

const statsPath = '/api/me/stats'

function mount() {
  return mountSuspended(ProfileStats)
}

async function stats() {
  const wrapper = await mount()
  await vi.waitFor(() =>
    expect(wrapper.find(tid('stats-bags')).exists()).toBe(true),
  )

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

  it('shows its heading and a skeleton while the stats load', async () => {
    const hold = holdRequest('GET', statsPath)

    const wrapper = await mount()

    expect(wrapper.get('h2').text()).toBe('Your coffee')
    expect(wrapper.find(tid('profile-stats-skeleton')).exists()).toBe(true)
    expect(wrapper.find(tid('stats-bags')).exists()).toBe(false)

    hold.release()

    await vi.waitFor(() =>
      expect(wrapper.find(tid('stats-bags')).exists()).toBe(true),
    )
    expect(wrapper.find(tid('profile-stats-skeleton')).exists()).toBe(false)
  })

  it('shows an error that can be retried', async () => {
    const lift = failRequest('GET', statsPath, { status: 500, message: 'Nope' })

    const wrapper = await mount()
    await vi.waitFor(() =>
      expect(wrapper.find(tid('profile-stats-error')).exists()).toBe(true),
    )

    lift()
    await wrapper.get(tid('profile-stats-retry')).trigger('click')

    await vi.waitFor(() =>
      expect(wrapper.find(tid('stats-bags')).exists()).toBe(true),
    )
    expect(wrapper.find(tid('profile-stats-error')).exists()).toBe(false)
  })
})
