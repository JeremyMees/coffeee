import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import RoasterResult from '~/components/RoasterResult.vue'
import { tid } from '../fixtures'
import { listedRoaster } from '#test/fixtures/roasters'

function result(overrides: Partial<ListedRoaster> = {}) {
  return mountSuspended(RoasterResult, {
    props: { roaster: listedRoaster(overrides) },
  })
}

describe('RoasterResult', () => {
  it('names its logo and name for the morph into the roaster it opens', async () => {
    clearNuxtState('roaster-morph')
    const wrapper = await result()
    expect(
      wrapper.get(tid('roaster-result', 'roaster-logo')).attributes('style'),
    ).toBeUndefined()

    await wrapper.get(tid('roaster-result')).trigger('click')

    expect(
      wrapper.get(tid('roaster-result', 'roaster-logo')).attributes('style'),
    ).toContain('view-transition-name: roaster-logo-r2')
    expect(
      wrapper.get(tid('roaster-result-name')).attributes('style'),
    ).toContain('view-transition-name: roaster-name-r2')
  })

  it('opens the roaster and names it and where it is', async () => {
    const wrapper = await result()

    expect(wrapper.get(tid('roaster-result')).attributes('href')).toBe(
      '/roasters/square-mile-r2',
    )
    expect(wrapper.get(tid('roaster-result-name')).text()).toBe('Square Mile')
    expect(wrapper.get(tid('roaster-result-place')).text()).toBe(
      'London, United Kingdom',
    )
  })

  it('shows how many of the shelf’s coffees are from it and when it was last bought from', async () => {
    const wrapper = await result()

    expect(wrapper.get(tid('roaster-result-bought')).text()).toBe(
      `2 coffees · last bought ${formatDate('2026-11-01')}`,
    )
    expect(
      (await result({ shelfCoffees: 1 }))
        .get(tid('roaster-result-bought'))
        .text(),
    ).toContain('1 coffee ·')
  })

  it('leaves that out for a roaster the shelf never bought from', async () => {
    const wrapper = await result({
      shelfCoffees: 0,
      lastBought: null,
      city: null,
      countryCode: null,
    })

    expect(wrapper.find(tid('roaster-result-bought')).exists()).toBe(false)
    expect(wrapper.find(tid('roaster-result-place')).exists()).toBe(false)
  })

  it('shows a placeholder without a logo', async () => {
    const wrapper = await result()

    expect(wrapper.get(tid('roaster-logo-placeholder')).text()).toBe('S')
  })
})
