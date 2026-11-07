import { onlineManager } from '@tanstack/vue-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { shelfCoffeePath, shelfPath, useAddCoffee } from '#imports'
import type { Member } from '#test/support/types'
import { daysAgo, forgetLastShelf, tid } from '../../../fixtures'
import { failRequest, holdRequest, scenario, signIn } from '../../../server'

let sarah: Member

beforeEach(async () => {
  forgetLastShelf()
  useAddCoffee().value = false
  sarah = await scenario.member('Sarah')
  await signIn(sarah)
})

afterEach(() => onlineManager.setOnline(true))

function stockPath() {
  return `/api/shelves/${sarah.shelf.id}/stock`
}

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
    await vi.waitFor(() =>
      expect(page.find(tid('stock', 'coffee-card')).exists()).toBe(true),
    )
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
    await vi.waitFor(() =>
      expect(page.find(tid('stock-empty')).exists()).toBe(true),
    )

    await page.get(tid('stock-empty-add-coffee')).trigger('click')

    expect(page.get(tid('stock-empty')).text()).toContain(
      'Nothing in stock yet',
    )
    expect(useAddCoffee().value).toBe(true)
  })

  it('shows the page and a skeleton while the coffees load', async () => {
    await scenario.coffee(sarah.shelf)
    const hold = holdRequest('GET', stockPath())

    const page = await stock()

    expect(page.get(tid('page-title')).text()).toBe('Stock')
    expect(page.find(tid('stock-skeleton')).exists()).toBe(true)
    expect(page.find(tid('stock')).exists()).toBe(false)

    hold.release()

    await vi.waitFor(() => expect(page.find(tid('stock')).exists()).toBe(true))
    expect(page.find(tid('stock-skeleton')).exists()).toBe(false)
  })

  it('shows an error with a retry when the coffees fail to load', async () => {
    await scenario.coffee(sarah.shelf)
    const lift = failRequest('GET', stockPath(), {
      status: 403,
      message: 'Nope',
    })

    const page = await stock()
    await vi.waitFor(() =>
      expect(page.find(tid('stock-error')).exists()).toBe(true),
    )
    expect(page.get(tid('page-title')).text()).toBe('Stock')
    expect(page.find(tid('stock-skeleton')).exists()).toBe(false)

    lift()
    await page.get(tid('stock-retry')).trigger('click')

    await vi.waitFor(() => expect(page.find(tid('stock')).exists()).toBe(true))
    expect(page.find(tid('stock-error')).exists()).toBe(false)
  })

  it('says it is offline instead of showing a skeleton forever', async () => {
    await scenario.coffee(sarah.shelf)
    onlineManager.setOnline(false)

    const page = await stock()

    expect(page.find(tid('stock-offline')).exists()).toBe(true)
    expect(page.find(tid('stock-skeleton')).exists()).toBe(false)

    onlineManager.setOnline(true)
    await page.get(tid('stock-retry')).trigger('click')

    await vi.waitFor(() => expect(page.find(tid('stock')).exists()).toBe(true))
    expect(page.find(tid('stock-offline')).exists()).toBe(false)
  })
})
