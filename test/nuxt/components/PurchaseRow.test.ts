import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import PurchaseRow from '~/components/PurchaseRow.vue'
import { api, fakeApi, resetApi } from '../fake-api'
import { tid } from '../fixtures'
import { ayele } from '#test/fixtures/coffees'

fakeApi()

beforeEach(resetApi)

const [inStock, finished] = ayele().purchases

function mountRow(purchase = inStock!) {
  return mountSuspended(PurchaseRow, {
    props: { shelfId: 'home', coffeeId: 'c1', purchase },
  })
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

    await vi.waitFor(() =>
      expect(api.purchaseCalls).toEqual([{ finish: 'p2' }]),
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
    expect(api.purchaseCalls).toEqual([])

    await row.get(tid('purchase-delete')).trigger('click')
    await row.get(tid('purchase-delete-confirm')).trigger('click')

    await vi.waitFor(() =>
      expect(api.purchaseCalls).toEqual([{ delete: 'p2' }]),
    )
  })

  it('says why the purchase could not be changed', async () => {
    api.purchaseFails = true
    const row = await mountRow()

    await row.get(tid('purchase-finish')).trigger('click')

    await vi.waitFor(() =>
      expect(row.get(tid('purchase-error')).text()).toBe(
        'The shelf is out of reach',
      ),
    )
  })
})
