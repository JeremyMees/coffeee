import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { clearError, useCurrentUser, useError } from '#imports'
import { api, fakeApi, resetApi } from '../../../../fake-api'
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
import { ayele } from '#test/fixtures/coffees'
import { testUser } from '#test/fixtures/users'

fakeApi()

mockNuxtImport(
  'compressPhoto',
  () => async () => new Blob(['small'], { type: 'image/webp' }),
)

beforeEach(() => {
  forgetLastShelf()
  clearError()
  resetApi()
  useCurrentUser().value = testUser()
})

describe('a coffee page', () => {
  it('shows the coffee and the bags bought on this shelf', async () => {
    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })

    expect(page.get(tid('coffee-title')).text()).toBe('Ayele Fulasa')
    expect(page.get(tid('coffee-roaster-name')).text()).toBe('Square Mile')

    const [latest, earlier] = page.findAll(tid('purchase'))
    const text = (purchase: typeof latest, part: string) =>
      purchase!.get(tid(part)).text().replace(/\s+/g, ' ')

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
    api.coffee = { ...ayele(), purchases: [] }

    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })

    expect(page.get(tid('purchases-empty')).text()).toBe(
      'Nobody on this shelf has bought it yet.',
    )
    expect(page.get(tid('coffee-buy-again')).text()).toBe('Add to shelf')
  })

  it('offers to buy it again once the shelf has a bag', async () => {
    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })

    expect(page.get(tid('coffee-buy-again')).text()).toBe('Buy again')
  })

  it('leads back to Stock', async () => {
    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })
    const back = page.get(tid('coffee-back'))

    expect(back.text()).toBe('Stock')
    expect(back.attributes('href')).toBe('/shelves/home')
  })

  it('offers no edit to someone who can only read it', async () => {
    api.coffee = { ...ayele(), canEdit: false }

    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })

    expect(page.find(tid('coffee-edit')).exists()).toBe(false)
  })

  it('shows the new details once they are saved', async () => {
    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
      attachTo: document.body,
    })
    await page.get(tid('coffee-edit')).trigger('click')
    await vi.waitFor(() => expect(byTestId('edit-coffee-form')).not.toBeNull())

    await type('coffee-name', 'Ayele Fulasa Natural')
    await submit('edit-coffee-form')

    await vi.waitFor(() =>
      expect(page.get(tid('coffee-title')).text()).toBe('Ayele Fulasa Natural'),
    )
    expect(byTestId('edit-coffee-sheet')).toBeNull()
  })

  it('rates the coffee and marks it a favourite once it would be bought again', async () => {
    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })

    await page.get(tid('verdict-star-5')).trigger('click')
    await vi.waitFor(() =>
      expect(page.get(tid('verdict-rating')).text()).toBe('5 stars'),
    )
    expect(page.find(tid('verdict-favourite')).exists()).toBe(false)

    await page.get(tid('verdict-buy-again')).trigger('click')
    await vi.waitFor(() =>
      expect(page.find(tid('verdict-favourite')).exists()).toBe(true),
    )
    expect(api.verdicts).toEqual([{ rating: 5 }, { wouldBuyAgain: true }])
  })

  it('shows the community rating and everyone’s reviews', async () => {
    api.coffee.communityRating = { average: 3.5, raters: 2, wouldBuyAgain: 1 }
    api.coffee.reviews = [
      {
        userId: 'tom',
        name: 'Tom',
        rating: 2,
        wouldBuyAgain: false,
        mine: false,
        updatedAt: '2026-10-01T10:00:00.000Z',
      },
    ]

    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })

    expect(page.get(tid('coffee-reviews-average')).text()).toContain('3.5')
    expect(page.get(tid('review-tom')).text()).toContain('Tom')
    expect(
      page.get(tid('review-tom', 'rating-stars')).attributes('data-rating'),
    ).toBe('2')
  })

  it('says when nobody has rated the coffee yet', async () => {
    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })

    expect(page.get(tid('coffee-reviews-unrated')).text()).toBe(
      'Nobody has rated this coffee yet.',
    )
  })

  it('keeps a grind setting for the coffee, not in its details', async () => {
    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })

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
    api.coffee.otherGrindSettings = [
      {
        grinderId: 'opus',
        brand: 'Fellow',
        model: 'Opus Gen 2',
        brewMethodId: 'espresso',
        brewMethod: 'Espresso',
        setting: '11',
        userId: 'ana',
        name: 'Ana',
        ownedByShelf: true,
      },
    ]

    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })

    expect(
      page.get(tid('other-grind-grinder-opus', 'other-grind-setting')).text(),
    ).toContain('Ana')
  })

  it('shows the roaster and its edited details', async () => {
    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
      attachTo: document.body,
    })
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
    await mountSuspended(App, { route: '/shelves/home/coffees/nope' })

    expect(useError().value).toMatchObject({ statusCode: 404 })
  })

  it('says where it was grown', async () => {
    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })

    expect(page.get(tid('detail-origins')).text()).toBe('Ethiopia')
    expect(page.get(tid('detail-regions')).text()).toBe('Guji')
    expect(page.get(tid('detail-altitude')).text()).toBe('1,900–2,200 m')
    expect(page.get(tid('detail-washing-stations')).text()).toBe('Hambela')
    expect(page.find(tid('detail-farms')).exists()).toBe(false)
  })

  it('says how it was made and links to the roaster', async () => {
    api.coffee = {
      ...ayele(),
      processes: [
        { id: 's1', name: 'Washed' },
        { id: 's3', name: 'Anaerobic' },
      ],
      varietals: [{ id: 'v1', name: 'Geisha' }],
      flavorNotes: [{ id: 'n1', name: 'Lime' }],
      link: 'https://example.com/ayele',
    }

    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })

    expect(page.get(tid('detail-processes')).text()).toBe('Washed, Anaerobic')
    expect(page.get(tid('detail-varietals')).text()).toBe('Geisha')
    expect(page.get(tid('detail-flavor-notes')).text()).toBe('Lime')
    const link = page.get(tid('coffee-link-out'))
    expect(link.attributes('href')).toBe('https://example.com/ayele')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
  })

  it('says how it was roasted', async () => {
    api.coffee = { ...ayele(), roastLevel: 'light', roastedFor: 'filter' }

    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })

    expect(page.get(tid('detail-roast')).text()).toBe('Light · Filter')
  })

  it('says who grew it', async () => {
    api.coffee = {
      ...ayele(),
      producers: [
        { id: 'n1', name: 'Nestor Lasso' },
        { id: 'n2', name: 'Diego Bermudez' },
      ],
    }

    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })

    expect(page.get(tid('detail-producers')).text()).toBe(
      'Nestor Lasso, Diego Bermudez',
    )
  })

  it('names the country of each region of a blend', async () => {
    api.coffee = {
      ...ayele(),
      origins: [
        { code: 'CO', name: 'Colombia' },
        { code: 'ET', name: 'Ethiopia' },
      ],
      regions: [
        { id: 'h1', name: 'Huila', origin: 'CO' },
        { id: 'g1', name: 'Guji', origin: 'ET' },
      ],
      farms: [{ id: 'f1', name: 'La Palma', origin: 'CO' }],
    }

    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })

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
    api.coffee = {
      ...ayele(),
      origins: [],
      regions: [],
      farms: [],
      washingStations: [],
      producers: [],
      processes: [],
      varietals: [],
      flavorNotes: [],
      link: null,
      altitudeFrom: null,
      altitudeTo: null,
    }

    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })

    expect(
      page
        .get(tid('coffee-details'))
        .findAll('dt')
        .map(term => term.text()),
    ).toEqual(['Roast'])
    expect(page.find(tid('coffee-link-out')).exists()).toBe(false)
  })

  it('heads the page with the photo of the bag', async () => {
    api.coffee = { ...ayele(), photoUrl: '/api/photos/coffees/a.webp' }

    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })

    expect(page.get(tid('coffee-photo-image')).attributes('src')).toBe(
      '/api/photos/coffees/a.webp',
    )
    expect(page.find(tid('coffee-card')).exists()).toBe(false)
  })

  it('shows a new photo once it is uploaded', async () => {
    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })
    const input = page.get(tid('coffee-photo-input'))
    Object.defineProperty(input.element, 'files', {
      value: [new File(['huge'], 'bag.jpg', { type: 'image/jpeg' })],
    })

    await input.trigger('change')

    await vi.waitFor(() =>
      expect(page.get(tid('coffee-photo-image')).attributes('src')).toBe(
        '/api/photos/coffees/new.webp',
      ),
    )
  })

  it('sums up what the shelf bought', async () => {
    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })

    expect(page.get(tid('summary-last-bought')).text()).toBe(
      formatDate('2026-11-01'),
    )
    expect(page.get(tid('summary-times-bought')).text()).toBe('2 times')
  })

  it('buys the coffee again from the last purchase', async () => {
    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
      attachTo: document.body,
    })
    await page.get(tid('coffee-buy-again')).trigger('click')
    await vi.waitFor(() => expect(byTestId('purchase-form')).not.toBeNull())

    await submit('purchase-form')

    await vi.waitFor(() =>
      expect(page.findAll(tid('purchase'))).toHaveLength(3),
    )
    expect(page.get(tid('summary-times-bought')).text()).toBe('3 times')
    expect(byTestId('purchase-sheet')).toBeNull()
  })

  it('finishes the oldest bag in stock and offers no finish once all are', async () => {
    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })

    await page.get(tid('coffee-finish')).trigger('click')

    await vi.waitFor(() =>
      expect(
        page.findAll(tid('purchase-status')).map(status => status.text()),
      ).toEqual(['Finished', 'Finished']),
    )
    expect(page.find(tid('coffee-finish')).exists()).toBe(false)
  })

  it('says why the coffee could not be finished', async () => {
    api.purchaseFails = true
    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })

    await page.get(tid('coffee-finish')).trigger('click')

    await vi.waitFor(() =>
      expect(page.get(tid('coffee-finish-error')).text()).toBe(
        'The shelf is out of reach',
      ),
    )
  })

  it('edits a purchase in the history', async () => {
    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
      attachTo: document.body,
    })
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
    expect(api.purchaseCalls).toMatchObject([{ edit: 'p1' }])
  })

  it('says nobody bought it once every purchase is deleted', async () => {
    api.coffee = { ...ayele(), purchases: ayele().purchases.slice(0, 1) }
    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })

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
    api.coffee = { ...api.coffee, canDelete: true }
    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })

    await page.get(tid('coffee-delete')).trigger('click')
    await click('confirm-dialog-confirm')

    await vi.waitFor(() => expect(currentPath()).toBe('/shelves/home'))
    expect(api.coffeeDeletes).toEqual(['c1'])
  })

  it('explains why the coffee could not be deleted', async () => {
    api.coffee = { ...api.coffee, canDelete: true }
    api.coffeeDeleteFails = true
    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })

    await page.get(tid('coffee-delete')).trigger('click')
    await click('confirm-dialog-confirm')

    await vi.waitFor(() =>
      expect(byTestId('delete-coffee', 'form-error')?.textContent).toContain(
        'only an admin can delete it',
      ),
    )
    expect(currentPath()).toBe('/shelves/home/coffees/c1')
  })

  it('offers no delete button to someone who may not delete it', async () => {
    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })

    expect(page.find(tid('coffee-delete')).exists()).toBe(false)
  })
})
