import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CoffeeSpecCard from '~/components/molecules/CoffeeSpecCard.vue'
import type { SpecCardCoffee } from '#imports'
import { tid } from '../../fixtures'

const coffee: SpecCardCoffee = {
  id: 'c1',
  name: 'Ayele Fulasa',
  roaster: 'Square Mile',
  roastLevel: 'light',
  roastedFor: 'filter',
  flavorNotes: [
    { id: 'n1', name: 'Lime' },
    { id: 'n2', name: 'Jasmine' },
  ],
  photoUrl: null,
}

function card(props: Record<string, unknown> = {}, slots = {}) {
  return mountSuspended(CoffeeSpecCard, {
    props: { coffee, testid: 'spec', ...props },
    slots,
  })
}

beforeEach(() => {
  clearNuxtState('coffee-morph')
})

describe('CoffeeSpecCard', () => {
  it('names the roaster, the coffee, its roast and its notes', async () => {
    const wrapper = await card()

    expect(wrapper.get(tid('spec-roaster')).text()).toBe('Square Mile')
    expect(wrapper.get(tid('spec-name')).text()).toBe('Ayele Fulasa')
    expect(wrapper.get(tid('spec-roast')).text()).toBe('Light · Filter')
    expect(
      wrapper.findAll(tid('spec-flavor-note')).map(note => note.text()),
    ).toEqual(['Lime', 'Jasmine'])
  })

  it('leaves out the roaster and the notes when asked or unknown', async () => {
    const wrapper = await card({
      coffee: { ...coffee, flavorNotes: [] },
      hideRoaster: true,
    })

    expect(wrapper.find(tid('spec-roaster')).exists()).toBe(false)
    expect(wrapper.find(tid('spec-flavor-notes')).exists()).toBe(false)
  })

  it('links to the coffee only when given where to go', async () => {
    expect((await card()).get(tid('spec')).element.tagName).toBe('ARTICLE')
    expect(
      (await card({ to: '/coffees/ayele-fulasa-c1' }))
        .get(tid('spec'))
        .attributes('href'),
    ).toBe('/coffees/ayele-fulasa-c1')
  })

  it('names its photo and name for the morph into the coffee it opens', async () => {
    const wrapper = await card({ to: '/coffees/ayele-fulasa-c1' })

    await wrapper.get(tid('spec')).trigger('click')

    expect(wrapper.get(tid('spec-photo-frame')).attributes('style')).toContain(
      'view-transition-name: coffee-photo-c1',
    )
    expect(wrapper.get(tid('spec-name')).attributes('style')).toContain(
      'view-transition-name: coffee-name-c1',
    )
  })

  it('puts its badge, facts and ratings in place', async () => {
    const wrapper = await card(
      {},
      {
        badge: () => 'On your shelf',
        facts: () => 'Origin row',
        ratings: () => 'Rating row',
      },
    )
    const text = wrapper.text()

    expect(text).toContain('On your shelf')
    expect(text.indexOf('Light · Filter')).toBeLessThan(
      text.indexOf('Origin row'),
    )
    expect(text.indexOf('Origin row')).toBeLessThan(text.indexOf('Lime'))
    expect(text.indexOf('Lime')).toBeLessThan(text.indexOf('Rating row'))
  })

  it('labels what matched the search', async () => {
    const wrapper = await card({
      coffee: {
        ...coffee,
        matches: [{ field: 'flavorNotes', name: 'Lime' }],
      },
    })

    expect(wrapper.findAll(tid('spec-match')).map(m => m.text())).toEqual([
      'Flavor note: Lime',
    ])
  })
})
