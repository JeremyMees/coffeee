import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { shelfCoffeePath, shelfPath, useAddCoffee } from '#imports'
import type { Member } from '#test/support/types'
import { daysAgo, forgetLastShelf, tid } from '../../../fixtures'
import { scenario, signIn } from '../../../server'

let sarah: Member

beforeEach(async () => {
  forgetLastShelf()
  useAddCoffee().value = false
  sarah = await scenario.member('Sarah')
  await signIn(sarah)
})

function stock() {
  return mountSuspended(App, { route: shelfPath(sarah.shelf) })
}

describe('the Stock page', () => {
  it('has Stock as its heading', async () => {
    const page = await stock()

    expect(page.get(tid('page-title')).text()).toBe('Stock')
  })

  it('shows each coffee in stock as a card that opens it', async () => {
    const ayele = await scenario.coffee(sarah.shelf, {
      roastLevel: 'medium-dark',
      roastedFor: 'espresso',
      roastedOn: daysAgo(3),
      flavorNotes: ['Lime'],
    })
    await scenario.verdict(sarah, ayele.id, { rating: 4 })

    const page = await stock()
    const card = page.get(tid('stock', 'coffee-card'))

    expect(card.attributes('href')).toBe(shelfCoffeePath(sarah.shelf, ayele))
    expect(card.get(tid('coffee-card-name')).text()).toBe('Ayele Fulasa')
    expect(card.get(tid('coffee-card-flavor-note')).text()).toBe('Lime')
    expect(
      card
        .get(tid('coffee-card-rating', 'rating-stars'))
        .attributes('aria-label'),
    ).toBe('4 stars')
  })

  it('invites adding a coffee when nothing is in stock', async () => {
    const page = await stock()

    await page.get(tid('stock-empty-add-coffee')).trigger('click')

    expect(page.get(tid('stock-empty')).text()).toContain(
      'Nothing in stock yet',
    )
    expect(useAddCoffee().value).toBe(true)
  })
})
