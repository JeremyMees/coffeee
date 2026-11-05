import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { and, eq } from 'drizzle-orm'
import App from '~/app.vue'
import { clearError, shelfCoffeePath, shelfPath, useError } from '#imports'
import { coffee, coffeeVerdict, purchase } from '#server/db/schemas'
import type { Member, ScenarioCoffee } from '#test/support/types'
import {
  allByTestId,
  byTestId,
  currentPath,
  click,
  forgetLastShelf,
  submit,
  tid,
  type,
} from '../../../../fixtures'
import { database, scenario, signIn } from '../../../../server'

mockNuxtImport(
  'compressPhoto',
  () => async () => new Blob(['small'], { type: 'image/webp' }),
)

type ShelfCoffee = Awaited<ReturnType<typeof scenario.coffee>>

let sarah: Member

beforeEach(async () => {
  forgetLastShelf()
  clearError()
  sarah = await scenario.member('Sarah')
  await signIn(sarah)
})

const ayeleDetails: ScenarioCoffee = {
  origins: ['ET'],
  regions: [{ origin: 'ET', name: 'Guji' }],
  washingStations: [{ origin: 'ET', name: 'Hambela' }],
  processes: ['Washed'],
  altitudeFrom: 1900,
  altitudeTo: 2200,
}

async function firstBag(details: ScenarioCoffee = {}) {
  const added = await scenario.coffee(sarah.shelf, {
    ...ayeleDetails,
    purchasedOn: '2026-09-01',
    sizeGrams: null,
    ...details,
  })
  await scenario.roasterDetails(
    sarah,
    await scenario.roaster(sarah, 'Square Mile'),
    {
      name: 'Square Mile',
      website: 'https://www.squaremilecoffee.com',
      countryCode: 'GB',
      city: 'London',
    },
  )

  return added
}

async function ayele(details: ScenarioCoffee = {}) {
  const added = await firstBag(details)
  await scenario.finishBag(sarah.shelf, added.id)
  await scenario.bag(sarah.shelf, added.id, {
    purchasedOn: '2026-11-01',
    roastedOn: '2026-10-28',
    sizeGrams: 250,
    price: 16.5,
  })

  return added
}

async function coffeePage(shown: ShelfCoffee) {
  return mountSuspended(App, {
    route: shelfCoffeePath(sarah.shelf, shown),
    attachTo: document.body,
  })
}

async function storedPurchases(coffeeId: string) {
  const db = await database()

  return db
    .select({ id: purchase.id, sizeGrams: purchase.sizeGrams })
    .from(purchase)
    .where(eq(purchase.coffeeId, coffeeId))
}

describe('a coffee page', () => {
  it('shows the coffee and the bags bought on this shelf', async () => {
    const page = await coffeePage(await ayele())

    expect(page.get(tid('coffee-title')).text()).toBe('Ayele Fulasa')
    expect(page.get(tid('coffee-roaster-name')).text()).toBe('Square Mile')

    const [latest, earlier] = page.findAll(tid('purchase'))
    const text = (shown: typeof latest, part: string) =>
      shown!.get(tid(part)).text().replace(/\s+/g, ' ')

    expect(text(latest, 'purchase-bought')).toBe(
      `Bought ${formatDate('2026-11-01')}`,
    )
    expect(text(latest, 'purchase-roasted')).toBe(
      `Roasted ${formatDate('2026-10-28')}`,
    )
    expect(text(latest, 'purchase-size-price')).toMatch(/^250 g · €\s?16\.50$/)
    expect(text(latest, 'purchase-status')).toBe('In stock')
    expect(text(earlier, 'purchase-roasted')).toBe('No roast date')
    expect(text(earlier, 'purchase-size-price')).toBe(
      'Size unknown · Price unknown',
    )
    expect(text(earlier, 'purchase-status')).toBe('Finished')
  })

  it('says when nobody on this shelf has bought it yet', async () => {
    const tom = await scenario.member('Tom')
    const boughtByTom = await scenario.coffee(tom.shelf)

    const page = await coffeePage(boughtByTom)

    expect(page.get(tid('purchases-empty')).text()).toBe(
      'Nobody on this shelf has bought it yet.',
    )
    expect(page.get(tid('coffee-buy-again')).text()).toBe('Add to shelf')
  })

  it('offers to buy it again once the shelf has a bag', async () => {
    const page = await coffeePage(await ayele())

    expect(page.get(tid('coffee-buy-again')).text()).toBe('Buy again')
  })

  it('leads back to Stock', async () => {
    const page = await coffeePage(await ayele())
    const back = page.get(tid('coffee-back'))

    expect(back.text()).toBe('Stock')
    expect(back.attributes('href')).toBe(shelfPath(sarah.shelf))
  })

  it('offers no edit to someone who can only read it', async () => {
    const tom = await scenario.member('Tom')
    await scenario.joinShelf(tom, sarah.shelf)
    const addedByTom = await scenario.coffee(sarah.shelf, {}, tom)

    const page = await coffeePage(addedByTom)

    expect(page.find(tid('coffee-edit')).exists()).toBe(false)
  })

  it('shows the new details once they are saved', async () => {
    const page = await coffeePage(await ayele())
    await page.get(tid('coffee-edit')).trigger('click')
    await vi.waitFor(() => expect(byTestId('edit-coffee-form')).not.toBeNull())

    await type('coffee-name', 'Ayele Fulasa Natural')
    await submit('edit-coffee-form')

    await vi.waitFor(
      () =>
        expect(page.get(tid('coffee-title')).text()).toBe(
          'Ayele Fulasa Natural',
        ),
      3000,
    )
    await vi.waitFor(() => expect(byTestId('edit-coffee-sheet')).toBeNull())
  })

  it('rates the coffee and marks it a favourite once it would be bought again', async () => {
    const shown = await ayele()
    const page = await coffeePage(shown)

    await page.get(tid('verdict-star-5')).trigger('click')
    await vi.waitFor(() => {
      expect(page.get(tid('verdict-rating')).text()).toBe('5 stars')
      expect(
        page.get(tid('verdict-buy-again')).attributes('disabled'),
      ).toBeUndefined()
    })
    expect(page.find(tid('verdict-favourite')).exists()).toBe(false)

    await page.get(tid('verdict-buy-again')).trigger('click')
    await vi.waitFor(() =>
      expect(page.find(tid('verdict-favourite')).exists()).toBe(true),
    )
    const db = await database()
    expect(
      await db
        .select({
          rating: coffeeVerdict.rating,
          wouldBuyAgain: coffeeVerdict.wouldBuyAgain,
        })
        .from(coffeeVerdict)
        .where(
          and(
            eq(coffeeVerdict.userId, sarah.id),
            eq(coffeeVerdict.coffeeId, shown.id),
          ),
        ),
    ).toEqual([{ rating: 5, wouldBuyAgain: true }])
  })

  it('shows the community rating and everyone’s reviews', async () => {
    const shown = await ayele()
    const tom = await scenario.member('Tom')
    await scenario.verdict(sarah, shown.id, { rating: 5, wouldBuyAgain: true })
    await scenario.verdict(tom, shown.id, { rating: 2, wouldBuyAgain: false })

    const page = await coffeePage(shown)

    expect(page.get(tid('coffee-reviews-average')).text()).toContain('3.5')
    expect(page.get(tid(`review-${tom.id}`)).text()).toContain('Tom')
    expect(
      page
        .get(tid(`review-${tom.id}`, 'rating-stars'))
        .attributes('data-rating'),
    ).toBe('2')
  })

  it('says when nobody has rated the coffee yet', async () => {
    const page = await coffeePage(await ayele())

    expect(page.get(tid('coffee-reviews-unrated')).text()).toBe(
      'Nobody has rated this coffee yet.',
    )
  })

  it('keeps a grind setting for the coffee, not in its details', async () => {
    const shown = await ayele()
    await scenario.grinder(sarah.shelf, {
      brand: 'Fellow',
      model: 'Opus Gen 2',
    })
    const page = await coffeePage(shown)

    await page.get(tid('grind-setting-input')).setValue('12')
    await page.get(tid('grind-setting-form')).trigger('submit')

    await vi.waitFor(() =>
      expect(page.get(tid('grind-setting-for')).text()).toBe(
        'Fellow Opus Gen 2 · Espresso',
      ),
    )
    expect(page.get(tid('grind-setting-value')).text()).toBe('12')
    expect(page.get(tid('coffee-details')).text()).not.toContain('Opus')
  })

  it('shows the grind settings other people use for the coffee', async () => {
    const shown = await ayele()
    const ana = await scenario.member('Ana')
    await scenario.joinShelf(ana, sarah.shelf)
    const opus = await scenario.grinder(sarah.shelf, {
      brand: 'Fellow',
      model: 'Opus Gen 2',
    })
    await scenario.grindSetting(ana, sarah.shelf, shown.id, {
      grinderId: opus.id,
      brewMethodId: (await scenario.brewMethod('Espresso')).id,
      setting: '11',
    })

    const page = await coffeePage(shown)

    expect(
      page
        .get(tid(`other-grind-grinder-${opus.id}`, 'other-grind-setting'))
        .text(),
    ).toContain('Ana')
  })

  it('shows the roaster and its edited details', async () => {
    const page = await coffeePage(await ayele())
    expect(page.get(tid('roaster-details-place')).text()).toBe(
      'London, United Kingdom',
    )

    await page.get(tid('roaster-edit')).trigger('click')
    await vi.waitFor(() => expect(byTestId('edit-roaster-form')).not.toBeNull())
    await type('roaster-city', 'Bristol')
    await submit('edit-roaster-form')

    await vi.waitFor(() =>
      expect(page.get(tid('roaster-details-place')).text()).toBe(
        'Bristol, United Kingdom',
      ),
    )
  })

  it('is not found when the shelf has no such coffee', async () => {
    await mountSuspended(App, {
      route: `${shelfPath(sarah.shelf)}/coffees/nope`,
    })

    expect(useError().value).toMatchObject({ statusCode: 404 })
  })

  it('says where it was grown', async () => {
    const page = await coffeePage(await ayele())

    expect(page.get(tid('detail-origins')).text()).toBe('Ethiopia')
    expect(page.get(tid('detail-regions')).text()).toBe('Guji')
    expect(page.get(tid('detail-altitude')).text()).toBe('1,900–2,200 m')
    expect(page.get(tid('detail-washing-stations')).text()).toBe('Hambela')
    expect(page.find(tid('detail-farms')).exists()).toBe(false)
  })

  it('says how it was made and links to the roaster', async () => {
    const page = await coffeePage(
      await ayele({
        processes: ['Washed', 'Anaerobic'],
        varietals: ['Geisha'],
        flavorNotes: ['Lime'],
        link: 'https://example.com/ayele',
      }),
    )

    expect(page.get(tid('detail-processes')).text()).toBe('Washed, Anaerobic')
    expect(page.get(tid('detail-varietals')).text()).toBe('Geisha')
    expect(page.get(tid('detail-flavor-notes')).text()).toBe('Lime')
    const link = page.get(tid('coffee-link-out'))
    expect(link.attributes('href')).toBe('https://example.com/ayele')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
  })

  it('says how it was roasted', async () => {
    const page = await coffeePage(
      await ayele({ roastLevel: 'light', roastedFor: 'filter' }),
    )

    expect(page.get(tid('detail-roast')).text()).toBe('Light · Filter')
  })

  it('says who grew it', async () => {
    const page = await coffeePage(
      await ayele({ producers: ['Nestor Lasso', 'Diego Bermudez'] }),
    )

    expect(page.get(tid('detail-producers')).text()).toBe(
      'Nestor Lasso, Diego Bermudez',
    )
  })

  it('names the country of each region of a blend', async () => {
    const page = await coffeePage(
      await ayele({
        origins: ['CO', 'ET'],
        regions: [
          { origin: 'CO', name: 'Huila' },
          { origin: 'ET', name: 'Guji' },
        ],
        farms: [{ origin: 'CO', name: 'La Palma' }],
      }),
    )

    expect(page.get(tid('detail-origins')).text()).toBe('Colombia, Ethiopia')
    expect(page.get(tid('detail-regions')).text()).toBe(
      'Huila (Colombia), Guji (Ethiopia)',
    )
    expect(page.get(tid('detail-farms')).text()).toBe('La Palma (Colombia)')
    expect(page.get(tid('detail-washing-stations')).text()).toBe(
      'Hambela (Ethiopia)',
    )
  })

  it('leaves out what nobody filled in', async () => {
    const page = await coffeePage(
      await ayele({
        regions: [],
        farms: [],
        washingStations: [],
        producers: [],
        varietals: [],
        flavorNotes: [],
        link: null,
        altitudeFrom: null,
        altitudeTo: null,
      }),
    )

    expect(
      page
        .get(tid('coffee-details'))
        .findAll('dt')
        .map(term => term.text()),
    ).toEqual(['Roast', 'Origin', 'Process'])
    expect(page.find(tid('coffee-link-out')).exists()).toBe(false)
  })

  it('heads the page with the photo of the bag', async () => {
    const shown = await ayele()
    const photoUrl = await scenario.coffeePhoto(shown.id)

    const page = await coffeePage(shown)

    expect(page.get(tid('coffee-photo-image')).attributes('src')).toBe(photoUrl)
    expect(page.find(tid('coffee-card')).exists()).toBe(false)
  })

  it('shows a new photo once it is uploaded', async () => {
    const page = await coffeePage(await ayele())
    const input = page.get(tid('coffee-photo-input'))
    Object.defineProperty(input.element, 'files', {
      value: [new File(['huge'], 'bag.jpg', { type: 'image/jpeg' })],
    })

    await input.trigger('change')

    await vi.waitFor(() =>
      expect(page.get(tid('coffee-photo-image')).attributes('src')).toMatch(
        /^\/api\/photos\/coffees\/[\w-]+\.webp$/,
      ),
    )
  })

  it('sums up what the shelf bought', async () => {
    const page = await coffeePage(await ayele())

    expect(page.get(tid('summary-last-bought')).text()).toBe(
      formatDate('2026-11-01'),
    )
    expect(page.get(tid('summary-times-bought')).text()).toBe('2 times')
  })

  it('buys the coffee again from the last purchase', async () => {
    const shown = await ayele()
    const page = await coffeePage(shown)
    await page.get(tid('coffee-buy-again')).trigger('click')
    await vi.waitFor(() => expect(byTestId('purchase-form')).not.toBeNull())

    await submit('purchase-form')

    await vi.waitFor(() => {
      expect(page.findAll(tid('purchase'))).toHaveLength(3)
      expect(page.get(tid('summary-times-bought')).text()).toBe('3 times')
      expect(byTestId('purchase-sheet')).toBeNull()
    })
    expect(await storedPurchases(shown.id)).toHaveLength(3)
  })

  it('finishes the oldest bag in stock and offers no finish once all are', async () => {
    const page = await coffeePage(await ayele())

    await page.get(tid('coffee-finish')).trigger('click')

    await vi.waitFor(() =>
      expect(
        page.findAll(tid('purchase-status')).map(status => status.text()),
      ).toEqual(['Finished', 'Finished']),
    )
    expect(page.find(tid('coffee-finish')).exists()).toBe(false)
  })

  it('says why the coffee could not be finished', async () => {
    const shown = await ayele()
    const page = await coffeePage(shown)
    await scenario.finishBag(sarah.shelf, shown.id)

    await page.get(tid('coffee-finish')).trigger('click')

    await vi.waitFor(() =>
      expect(page.get(tid('coffee-finish-error')).text()).toBe(
        'Nothing of this coffee is in stock',
      ),
    )
  })

  it('edits a purchase in the history', async () => {
    const shown = await ayele()
    const page = await coffeePage(shown)
    await page.findAll(tid('purchase-edit'))[1]!.trigger('click')
    await vi.waitFor(() => expect(byTestId('purchase-form')).not.toBeNull())

    expect(byTestId('form-sheet-title')!.textContent).toContain('Edit purchase')
    await type('coffee-size', '500')
    await submit('purchase-form')

    await vi.waitFor(() =>
      expect(allByTestId('purchase-size-price')[1]!.textContent).toContain(
        '500 g',
      ),
    )
    expect(await storedPurchases(shown.id)).toContainEqual({
      id: shown.purchaseId,
      sizeGrams: 500,
    })
    expect(await storedPurchases(shown.id)).toHaveLength(2)
  })

  it('says nobody bought it once every purchase is deleted', async () => {
    const page = await coffeePage(await firstBag())

    await page.get(tid('purchase-delete')).trigger('click')
    await page.get(tid('purchase-delete-confirm')).trigger('click')

    await vi.waitFor(() =>
      expect(page.find(tid('purchases-empty')).exists()).toBe(true),
    )
    expect(page.find(tid('purchase-summary')).exists()).toBe(false)
    expect(page.find(tid('coffee-finish')).exists()).toBe(false)
    expect(page.find(tid('coffee-buy-again')).exists()).toBe(true)
  })

  it('deletes the coffee and goes back', async () => {
    const shown = await ayele()
    const page = await coffeePage(shown)

    await page.get(tid('coffee-delete')).trigger('click')
    await click('confirm-dialog-confirm')

    await vi.waitFor(() => expect(currentPath()).toBe(shelfPath(sarah.shelf)))
    const db = await database()
    expect(
      await db.select().from(coffee).where(eq(coffee.id, shown.id)),
    ).toEqual([])
  })

  it('explains why the coffee could not be deleted', async () => {
    const shown = await ayele()
    const page = await coffeePage(shown)
    const tom = await scenario.member('Tom')
    await scenario.coffee(tom.shelf)

    await page.get(tid('coffee-delete')).trigger('click')
    await click('confirm-dialog-confirm')

    await vi.waitFor(() =>
      expect(byTestId('delete-coffee', 'form-error')?.textContent).toContain(
        'only an admin can delete it',
      ),
    )
    expect(currentPath()).toBe(shelfCoffeePath(sarah.shelf, shown))
  })

  it('offers no delete button to someone who may not delete it', async () => {
    const shown = await ayele()
    const tom = await scenario.member('Tom')
    await scenario.coffee(tom.shelf)

    const page = await coffeePage(shown)

    expect(page.find(tid('coffee-delete')).exists()).toBe(false)
  })
})
