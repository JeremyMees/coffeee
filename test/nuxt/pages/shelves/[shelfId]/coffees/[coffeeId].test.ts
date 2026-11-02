import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { clearError, useCurrentUser, useError } from '#imports'
import { api, ayele, fakeApi, resetApi } from '../../../../fake-api'
import {
  byTestId,
  forgetLastShelf,
  submit,
  testUser,
  tid,
  type,
} from '../../../../fixtures'

fakeApi()

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
    expect(page.get(tid('coffee-card-days')).text()).toContain('no roast date')
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
      link: 'https://example.com/ayele',
    }

    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })

    expect(page.get(tid('detail-processes')).text()).toBe('Washed, Anaerobic')
    expect(page.get(tid('detail-varietals')).text()).toBe('Geisha')
    const link = page.get(tid('coffee-link-out'))
    expect(link.attributes('href')).toBe('https://example.com/ayele')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
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
      link: null,
      altitudeFrom: null,
      altitudeTo: null,
    }

    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })

    expect(page.find(tid('coffee-details')).exists()).toBe(false)
    expect(page.find(tid('coffee-link-out')).exists()).toBe(false)
  })
})
