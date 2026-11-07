import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CoffeePurchases from '~/components/organisms/CoffeePurchases.vue'
import type { Member } from '#test/support/types'
import { tid } from '../../fixtures'
import { failRequest, holdRequest, scenario, signIn } from '../../server'

let sarah: Member
let coffeeId: string

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  coffeeId = (await scenario.coffee(sarah.shelf, { purchasedOn: '2026-09-01' }))
    .id
  await signIn(sarah)
})

function purchasesPath() {
  return `/api/shelves/${sarah.shelf.id}/coffees/${coffeeId}/purchases`
}

function openPurchases(id = coffeeId) {
  return mountSuspended(CoffeePurchases, {
    props: { shelfId: sarah.shelf.id, coffeeId: id },
  })
}

describe('CoffeePurchases', () => {
  it('lists the bags of the coffee on this shelf', async () => {
    const purchases = await openPurchases()

    await vi.waitFor(() =>
      expect(purchases.findAll(tid('purchase'))).toHaveLength(1),
    )
    expect(purchases.get(tid('coffee-buy-again')).text()).toBe('Buy again')
    expect(purchases.find(tid('coffee-purchases-skeleton')).exists()).toBe(
      false,
    )
  })

  it('offers to add the coffee when this shelf never bought it', async () => {
    const tom = await scenario.member('Tom')
    const tomsCoffee = await scenario.coffee(tom.shelf, { name: 'Halo' })

    const purchases = await openPurchases(tomsCoffee.id)

    await vi.waitFor(() =>
      expect(purchases.find(tid('purchases-empty')).exists()).toBe(true),
    )
    expect(purchases.get(tid('coffee-buy-again')).text()).toBe('Add to shelf')
  })

  it('shows its heading and a skeleton while the bags load', async () => {
    const hold = holdRequest('GET', purchasesPath())

    const purchases = await openPurchases()

    expect(purchases.get('h2').text()).toBe('Bags on this shelf')
    expect(purchases.find(tid('coffee-purchases-skeleton')).exists()).toBe(true)
    expect(purchases.find(tid('coffee-buy-again')).exists()).toBe(false)

    hold.release()

    await vi.waitFor(() =>
      expect(purchases.find(tid('purchases')).exists()).toBe(true),
    )
    expect(purchases.find(tid('coffee-purchases-skeleton')).exists()).toBe(
      false,
    )
  })

  it('shows an error that can be retried', async () => {
    const lift = failRequest('GET', purchasesPath(), {
      status: 403,
      message: 'Nope',
    })

    const purchases = await openPurchases()
    await vi.waitFor(() =>
      expect(purchases.find(tid('coffee-purchases-error')).exists()).toBe(true),
    )

    lift()
    await purchases.get(tid('coffee-purchases-retry')).trigger('click')

    await vi.waitFor(() =>
      expect(purchases.find(tid('purchases')).exists()).toBe(true),
    )
  })
})
