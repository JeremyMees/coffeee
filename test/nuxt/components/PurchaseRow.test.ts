import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { eq } from 'drizzle-orm'
import PurchaseRow from '~/components/PurchaseRow.vue'
import type { ShelfPurchase } from '#imports'
import { purchase } from '#server/db/schemas'
import type { Member } from '#test/support/types'
import { tid } from '../fixtures'
import { database, failRequest, scenario, signIn } from '../server'

let sarah: Member
let coffeeId: string
let inStock: ShelfPurchase
let finished: ShelfPurchase

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  coffeeId = (
    await scenario.coffee(sarah.shelf, {
      purchasedOn: '2026-09-01',
      sizeGrams: null,
    })
  ).id
  await scenario.finishBag(sarah.shelf, coffeeId)
  await scenario.bag(sarah.shelf, coffeeId, {
    purchasedOn: '2026-11-01',
    roastedOn: '2026-10-28',
    sizeGrams: 250,
    price: 16.5,
  })
  await signIn(sarah)
  const shelfCoffee = await $fetch<{ purchases: ShelfPurchase[] }>(
    `/api/shelves/${sarah.shelf.id}/coffees/${coffeeId}`,
  )
  ;[inStock, finished] = shelfCoffee.purchases as [ShelfPurchase, ShelfPurchase]
})

function mountRow(shown = inStock) {
  return mountSuspended(PurchaseRow, {
    props: { shelfId: sarah.shelf.id, coffeeId, purchase: shown },
  })
}

async function stored(purchaseId: string) {
  const db = await database()
  const [found] = await db
    .select({ finishedAt: purchase.finishedAt })
    .from(purchase)
    .where(eq(purchase.id, purchaseId))

  return found
}

describe('PurchaseRow', () => {
  it('shows when the bag was bought and roasted, its size and price', async () => {
    const row = await mountRow()
    const text = (part: string) =>
      row.get(tid(part)).text().replace(/\s+/g, ' ')

    expect(text('purchase-bought')).toBe(`Bought ${formatDate('2026-11-01')}`)
    expect(text('purchase-roasted')).toBe(`Roasted ${formatDate('2026-10-28')}`)
    expect(text('purchase-size-price')).toMatch(/^250 g · €\s?16\.50$/)
    expect(text('purchase-status')).toBe('In stock')
  })

  it('says what nobody wrote down', async () => {
    const row = await mountRow(finished)

    expect(row.get(tid('purchase-roasted')).text()).toBe('No roast date')
    expect(row.get(tid('purchase-size-price')).text()).toMatch(
      /^Size unknown\s+·\s+Price unknown$/,
    )
    expect(row.get(tid('purchase-status')).text()).toBe('Finished')
    expect(row.find(tid('purchase-finish')).exists()).toBe(false)
  })

  it('asks to edit the purchase', async () => {
    const row = await mountRow()

    await row.get(tid('purchase-edit')).trigger('click')

    expect(row.emitted('edit')).toEqual([[]])
  })

  it('marks the bag finished', async () => {
    const row = await mountRow()

    await row.get(tid('purchase-finish')).trigger('click')

    await vi.waitFor(async () =>
      expect((await stored(inStock.id))?.finishedAt).toBeInstanceOf(Date),
    )
  })

  it('deletes the purchase only once that is confirmed', async () => {
    const row = await mountRow()

    await row.get(tid('purchase-delete')).trigger('click')
    expect(row.get(tid('purchase-delete-question')).text()).toBe(
      'Delete this purchase?',
    )
    await row.get(tid('purchase-delete-cancel')).trigger('click')
    expect(row.find(tid('purchase-delete-question')).exists()).toBe(false)
    expect(await stored(inStock.id)).toBeDefined()

    await row.get(tid('purchase-delete')).trigger('click')
    await row.get(tid('purchase-delete-confirm')).trigger('click')

    await vi.waitFor(async () =>
      expect(await stored(inStock.id)).toBeUndefined(),
    )
  })

  it('says why the purchase could not be changed', async () => {
    failRequest(
      'POST',
      `/api/shelves/${sarah.shelf.id}/coffees/${coffeeId}/purchases/${inStock.id}/finish`,
      { status: 503, message: 'The shelf is out of reach' },
    )
    const row = await mountRow()

    await row.get(tid('purchase-finish')).trigger('click')

    await vi.waitFor(() =>
      expect(row.get(tid('purchase-error')).text()).toBe(
        'The shelf is out of reach',
      ),
    )
    expect((await stored(inStock.id))?.finishedAt).toBeNull()
  })
})
