import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CatalogResult from '~/components/molecules/CatalogResult.vue'
import { catalogCoffee } from '#test/fixtures/coffees'
import { tid } from '../../fixtures'

function result(overrides: Partial<CatalogCoffee> = {}, hideRoaster = false) {
  return mountSuspended(CatalogResult, {
    props: {
      coffee: catalogCoffee(overrides),
      to: '/shelves/sarahs-shelf-home/coffees/ayele-fulasa-c1',
      hideRoaster,
    },
  })
}

describe('CatalogResult', () => {
  it('names its photo and name for the morph into the coffee it opens', async () => {
    clearNuxtState('coffee-morph')
    const wrapper = await result()
    expect(
      wrapper.get(tid('catalog-result-photo-frame')).attributes('style'),
    ).toBeUndefined()

    await wrapper.get(tid('catalog-result')).trigger('click')

    expect(
      wrapper.get(tid('catalog-result-photo-frame')).attributes('style'),
    ).toContain('view-transition-name: coffee-photo-c1')
    expect(
      wrapper.get(tid('catalog-result-name')).attributes('style'),
    ).toContain('view-transition-name: coffee-name-c1')
  })

  it('opens the coffee and names it, its roaster and how it is roasted', async () => {
    const wrapper = await result()

    expect(wrapper.get(tid('catalog-result')).attributes('href')).toBe(
      '/shelves/sarahs-shelf-home/coffees/ayele-fulasa-c1',
    )
    expect(wrapper.get(tid('catalog-result-name')).text()).toBe('Ayele Fulasa')
    expect(wrapper.get(tid('catalog-result-roaster')).text()).toBe(
      'Square Mile',
    )
    expect(wrapper.get(tid('catalog-result-roast')).text()).toBe(
      'Light · Filter',
    )
    expect(wrapper.get(tid('catalog-result-origins')).text()).toBe('Ethiopia')
    expect(
      wrapper
        .findAll(tid('catalog-result-flavor-note'))
        .map(note => note.text()),
    ).toEqual(['Lime'])
  })

  it('leaves out the origin and notes it does not know', async () => {
    const wrapper = await result({ origins: [], flavorNotes: [] })

    expect(wrapper.find(tid('catalog-result-origins')).exists()).toBe(false)
    expect(wrapper.find(tid('catalog-result-flavor-notes')).exists()).toBe(
      false,
    )
  })

  it('leaves the roaster out when the list already names it', async () => {
    const wrapper = await result({}, true)

    expect(wrapper.find(tid('catalog-result-roaster')).exists()).toBe(false)
    expect(wrapper.get(tid('catalog-result-name')).text()).toBe('Ayele Fulasa')
  })

  it('shows the community rating apart from the viewer’s own', async () => {
    const wrapper = await result({
      communityRating: { average: 3.5, raters: 2 },
    })
    const rating = wrapper.get(tid('catalog-result-community-rating'))

    expect(rating.get(tid('community-rating')).attributes('aria-label')).toBe(
      'Community rating 3.5 from 2 people',
    )
    expect(wrapper.find(tid('rating-stars')).exists()).toBe(false)
  })

  it('marks a bought coffee, unless asked not to', async () => {
    expect((await result()).get(tid('catalog-result-bought')).text()).toBe(
      'Bought',
    )
    expect(
      (await result({ onShelf: false }))
        .find(tid('catalog-result-bought'))
        .exists(),
    ).toBe(false)
    const hidden = await mountSuspended(CatalogResult, {
      props: {
        coffee: catalogCoffee(),
        to: '/coffees/ayele-fulasa-c1',
        hideBought: true,
      },
    })
    expect(hidden.find(tid('catalog-result-bought')).exists()).toBe(false)
  })

  it('shows the viewer’s own rating, or that they did not rate it', async () => {
    expect(
      (await result({ rating: 4 }))
        .get(tid('catalog-result-rating', 'rating-stars'))
        .attributes('data-rating'),
    ).toBe('4')
    expect((await result()).get(tid('catalog-result-rating')).text()).toBe(
      'Not rated',
    )
  })

  it('labels what matched the search', async () => {
    const wrapper = await result({
      matches: [{ field: 'flavorNotes', name: 'Strawberry' }],
    })

    expect(
      wrapper.findAll(tid('catalog-result-match')).map(match => match.text()),
    ).toEqual(['Flavor note: Strawberry'])
    expect((await result()).find(tid('catalog-result-matches')).exists()).toBe(
      false,
    )
  })

  it('shows the photo of the bag, or a placeholder', async () => {
    const wrapper = await result({ photoUrl: '/api/photos/ayele.webp' })

    expect(wrapper.find(tid('catalog-result-photo')).exists()).toBe(true)
    expect(wrapper.find(tid('catalog-result-placeholder')).exists()).toBe(false)
    expect(
      (await result()).find(tid('catalog-result-placeholder')).exists(),
    ).toBe(true)
  })
})
