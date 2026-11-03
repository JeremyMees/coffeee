import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { clearError, useCurrentUser, useError } from '#imports'
import { api, fakeApi, resetApi } from '../../fake-api'
import {
  byTestId,
  forgetLastShelf,
  rememberShelf,
  submit,
  testUser,
  tid,
  type,
} from '../../fixtures'

fakeApi()

beforeEach(() => {
  forgetLastShelf()
  clearError()
  resetApi()
  useCurrentUser().value = testUser()
})

describe('the page of a coffee', () => {
  it('shows the coffee without the bags or verdicts of any shelf', async () => {
    const page = await mountSuspended(App, { route: '/coffees/c1' })

    expect(page.get(tid('coffee-title')).text()).toBe('Ayele Fulasa')
    expect(page.get(tid('coffee-roaster-name')).text()).toBe('Square Mile')
    expect(page.get(tid('detail-origins')).text()).toBe('Ethiopia')
    expect(page.get(tid('roaster-details-name')).text()).toBe('Square Mile')
    expect(page.find(tid('purchases')).exists()).toBe(false)
    expect(page.find(tid('coffee-buy-again')).exists()).toBe(false)
    expect(page.find(tid('grind-setting-form')).exists()).toBe(false)
  })

  it('leads back to Discover on the current shelf', async () => {
    rememberShelf('work')

    const page = await mountSuspended(App, { route: '/coffees/c1' })
    const back = page.get(tid('coffee-back'))

    expect(back.text()).toBe('Discover')
    expect(back.attributes('href')).toBe('/shelves/work/discover')
  })

  it('opens the coffee on each shelf of the viewer, with its bags there', async () => {
    const page = await mountSuspended(App, { route: '/coffees/c1' })

    const home = page.get(tid('coffee-shelf-home'))
    expect(home.attributes('href')).toBe('/shelves/home/coffees/c1')
    expect(home.text()).toContain("Sarah's shelf")
    expect(home.get(tid('coffee-shelf-bags')).text()).toBe(
      '2 bags · 1 in stock',
    )
    expect(page.get(tid('coffee-shelf-work', 'coffee-shelf-bags')).text()).toBe(
      'Not bought yet',
    )
  })

  it('rates the coffee', async () => {
    const page = await mountSuspended(App, { route: '/coffees/c1' })

    await page.get(tid('verdict-star-4')).trigger('click')

    await vi.waitFor(() =>
      expect(page.get(tid('verdict-rating')).text()).toBe('4 stars'),
    )
    expect(api.verdicts).toEqual([{ rating: 4 }])
  })

  it('shows the new details once they are saved', async () => {
    const page = await mountSuspended(App, {
      route: '/coffees/c1',
      attachTo: document.body,
    })
    await page.get(tid('coffee-edit')).trigger('click')
    await vi.waitFor(() => expect(byTestId('edit-coffee-form')).not.toBeNull())

    await type('coffee-name', 'Ayele Fulasa Natural')
    await submit('edit-coffee-form')

    await vi.waitFor(() =>
      expect(page.get(tid('coffee-title')).text()).toBe('Ayele Fulasa Natural'),
    )
  })

  it('offers no edit to someone who can only read it', async () => {
    api.coffee = { ...api.coffee, canEdit: false }

    const page = await mountSuspended(App, { route: '/coffees/c1' })

    expect(page.find(tid('coffee-edit')).exists()).toBe(false)
    expect(page.find(tid('coffee-photo-pick')).exists()).toBe(false)
  })

  it('is not found when there is no such coffee', async () => {
    await mountSuspended(App, { route: '/coffees/nope' })

    expect(useError().value).toMatchObject({ statusCode: 404 })
  })
})
