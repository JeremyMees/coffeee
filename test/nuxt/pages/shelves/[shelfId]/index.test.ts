import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { useAddCoffee, useCurrentUser } from '#imports'
import { api, fakeApi, resetApi } from '../../../fake-api'
import { daysAgo, forgetLastShelf, testUser, tid } from '../../../fixtures'

fakeApi()

beforeEach(() => {
  forgetLastShelf()
  resetApi()
  useCurrentUser().value = testUser()
  useAddCoffee().value = false
})

describe('the Stock page', () => {
  it('has Stock as its heading', async () => {
    const page = await mountSuspended(App, { route: '/shelves/home' })

    expect(page.get(tid('page-title')).text()).toBe('Stock')
  })

  it('shows each coffee in stock as a card that opens it', async () => {
    api.stock = [
      {
        id: 'c1',
        name: 'Ayele Fulasa',
        roaster: 'Square Mile',
        roastLevel: 'medium-dark',
        roastedFor: 'espresso',
        colour: '#2f6f4f',
        roastedOn: daysAgo(3),
        flavorNotes: [{ id: 'n1', name: 'Lime' }],
        rating: 4,
      },
    ]

    const page = await mountSuspended(App, { route: '/shelves/home' })
    const card = page.get(tid('stock', 'coffee-card'))

    expect(card.attributes('href')).toBe('/shelves/home/coffees/c1')
    expect(card.get(tid('coffee-card-name')).text()).toBe('Ayele Fulasa')
    expect(card.get(tid('coffee-card-flavor-note')).text()).toBe('Lime')
    expect(
      card
        .get(tid('coffee-card-rating', 'rating-stars'))
        .attributes('aria-label'),
    ).toBe('4 stars')
  })

  it('invites adding a coffee when nothing is in stock', async () => {
    const page = await mountSuspended(App, { route: '/shelves/home' })

    await page.get(tid('stock-empty-add-coffee')).trigger('click')

    expect(page.get(tid('stock-empty')).text()).toContain(
      'Nothing in stock yet',
    )
    expect(useAddCoffee().value).toBe(true)
  })
})
