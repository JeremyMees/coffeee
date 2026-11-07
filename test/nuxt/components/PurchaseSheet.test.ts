import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { desc, eq } from 'drizzle-orm'
import PurchaseSheet from '~/components/PurchaseSheet.vue'
import type { ShelfPurchase } from '#imports'
import { localDate } from '#imports'
import { purchase } from '#server/db/schemas'
import type { Member } from '#test/support/types'
import { byTestId, inputValue, submit, type } from '../fixtures'
import { database, failRequest, scenario, signIn } from '../server'

let sarah: Member
let coffeeId: string
let purchases: ShelfPurchase[]

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
  purchases = await $fetch<ShelfPurchase[]>(
    `/api/shelves/${sarah.shelf.id}/coffees/${coffeeId}/purchases`,
  )
})

async function openSheet(
  props: { purchase?: ShelfPurchase; open?: boolean } = {},
) {
  const open = props.open ?? true
  const sheet = await mountSuspended(PurchaseSheet, {
    props: { shelfId: sarah.shelf.id, coffeeId, purchases, ...props, open },
    attachTo: document.body,
  })

  if (open) {
    await vi.waitFor(
      () => expect(byTestId('purchase-form')).not.toBeNull(),
      3000,
    )
  }

  return sheet
}

function pickedDate(picker: string) {
  return byTestId(picker, 'date-picker-trigger')!.textContent?.trim()
}

async function stored() {
  const db = await database()

  return db
    .select({
      id: purchase.id,
      purchasedOn: purchase.purchasedOn,
      roastedOn: purchase.roastedOn,
      sizeGrams: purchase.sizeGrams,
      priceCents: purchase.priceCents,
    })
    .from(purchase)
    .where(eq(purchase.coffeeId, coffeeId))
    .orderBy(desc(purchase.createdAt))
}

describe('PurchaseSheet', () => {
  it('buys again from the last purchase, bought today', async () => {
    await openSheet()

    expect(byTestId('form-sheet-title')!.textContent).toContain('Buy again')
    expect(pickedDate('coffee-purchased-on')).toBe(formatDate(localDate()))
    expect(pickedDate('coffee-roasted-on')).toBe('Pick a date')
    expect(inputValue('coffee-size')).toBe('250')
    expect(inputValue('coffee-price')).toBe('16.50')
  })

  it('adds the purchase and closes', async () => {
    const sheet = await openSheet()

    await type('coffee-size', '1000')
    await submit('purchase-form')

    await vi.waitFor(() =>
      expect(sheet.emitted('update:open')).toEqual([[false]]),
    )
    const [added] = await stored()
    expect(added).toMatchObject({
      purchasedOn: localDate(),
      roastedOn: null,
      sizeGrams: 1000,
      priceCents: 1650,
    })
    expect(await stored()).toHaveLength(3)
  })

  it('edits a purchase from its own details', async () => {
    const sheet = await openSheet({ purchase: purchases[0] })

    expect(byTestId('form-sheet-title')!.textContent).toContain('Edit purchase')
    expect(pickedDate('coffee-purchased-on')).toBe(formatDate('2026-11-01'))
    expect(pickedDate('coffee-roasted-on')).toBe(formatDate('2026-10-28'))

    await type('coffee-price', '')
    await submit('purchase-form')

    await vi.waitFor(() =>
      expect(sheet.emitted('update:open')).toEqual([[false]]),
    )
    expect(await stored()).toContainEqual({
      id: purchases[0]!.id,
      purchasedOn: '2026-11-01',
      roastedOn: '2026-10-28',
      sizeGrams: 250,
      priceCents: null,
    })
    expect(await stored()).toHaveLength(2)
  })

  it('explains a size that makes no sense before sending anything', async () => {
    await openSheet()

    await type('coffee-size', '0')
    await submit('purchase-form')

    await vi.waitFor(() =>
      expect(byTestId('purchase-sheet')!.textContent).toContain(
        'The size has to be more than 0 g',
      ),
    )
    expect(await stored()).toHaveLength(2)
  })

  it('shows what the server refused next to the field', async () => {
    failRequest(
      'POST',
      `/api/shelves/${sarah.shelf.id}/coffees/${coffeeId}/purchases`,
      {
        status: 400,
        message: '',
        errors: { price: 'That price looks like a typo' },
      },
    )
    const sheet = await openSheet()

    await type('coffee-price', '999')
    await submit('purchase-form')

    await vi.waitFor(() =>
      expect(byTestId('purchase-sheet')!.textContent).toContain(
        'That price looks like a typo',
      ),
    )
    expect(sheet.emitted('update:open')).toBeUndefined()
    expect(await stored()).toHaveLength(2)
  })

  it('says why the purchase could not be saved and stays open', async () => {
    failRequest(
      'POST',
      `/api/shelves/${sarah.shelf.id}/coffees/${coffeeId}/purchases`,
      { status: 503, message: 'The shelf is out of reach' },
    )
    const sheet = await openSheet()

    await submit('purchase-form')

    await vi.waitFor(() =>
      expect(byTestId('form-error')!.textContent?.trim()).toBe(
        'The shelf is out of reach',
      ),
    )
    expect(sheet.emitted('update:open')).toBeUndefined()
    expect(await stored()).toHaveLength(2)
  })

  it('asks to close from its close button', async () => {
    const sheet = await openSheet()

    byTestId('purchase-sheet')!
      .querySelector<HTMLElement>('[data-testid="form-sheet-close"]')!
      .click()
    await flushPromises()

    expect(sheet.emitted('update:open')).toEqual([[false]])
  })

  it('throws away unsaved changes when it opens again', async () => {
    const sheet = await openSheet({ open: false })
    await sheet.setProps({ open: true })
    await vi.waitFor(() => expect(byTestId('purchase-form')).not.toBeNull())
    await type('coffee-size', '1')

    await sheet.setProps({ open: false })
    await sheet.setProps({ open: true })

    await vi.waitFor(() => expect(inputValue('coffee-size')).toBe('250'))
  })
})
