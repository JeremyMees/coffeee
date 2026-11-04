import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { clearError, useCurrentUser, useError } from '#imports'
import { api, fakeApi, resetApi } from '../../fake-api'
import { catalogCoffee, catalogCoffees } from '#test/fixtures/coffees'
import { click, forgetLastShelf, tid } from '../../fixtures'
import { testUser } from '#test/fixtures/users'

fakeApi()

beforeEach(() => {
  forgetLastShelf()
  clearError()
  resetApi()
  useCurrentUser().value = testUser()
})

async function roaster() {
  const page = await mountSuspended(App, {
    route: '/roasters/r2',
    attachTo: document.body,
  })

  return {
    page,
    names: () =>
      page.findAll(tid('catalog-result-name')).map(name => name.text()),
  }
}

describe('the page of a roaster', () => {
  it('names its logo and title for the morph from and back to the list', async () => {
    const { page } = await roaster()

    expect(page.get(tid('roaster-title')).attributes('style')).toContain(
      'view-transition-name: roaster-name-r2',
    )
    expect(page.get(tid('roaster-logo')).attributes('style')).toContain(
      'view-transition-name: roaster-logo-r2',
    )
  })

  it('shows its details and leads back to the roasters', async () => {
    const { page } = await roaster()

    expect(page.get(tid('roaster-title')).text()).toBe('Square Mile')
    expect(page.get(tid('roaster-place')).text()).toBe('London, United Kingdom')
    expect(page.get(tid('roaster-website')).attributes('href')).toBe(
      'https://www.squaremilecoffee.com',
    )
    expect(page.get(tid('roaster-logo-placeholder')).text()).toBe('S')
    expect(page.get(tid('roaster-back')).attributes('href')).toBe('/roasters')
  })

  it('lists every coffee from it, each opening its own page', async () => {
    api.catalog = catalogCoffees()

    const { page, names } = await roaster()

    expect(names()).toEqual(['Ayele Fulasa'])
    expect(api.catalogQueries.at(-1)).toMatchObject({ roasterId: 'r2' })
    expect(page.get(tid('catalog-result')).attributes('href')).toBe(
      '/coffees/ayele-fulasa-c1',
    )
    expect(page.findAll(tid('catalog-result-mine'))).toHaveLength(1)
  })

  it('keeps only the shelf’s own coffees with Mine', async () => {
    api.catalog = [
      catalogCoffee(),
      catalogCoffee({ id: 'c5', name: 'Red Brick', onShelf: false }),
    ]
    const { names } = await roaster()

    await click('roaster-filter-mine')

    await vi.waitFor(() => expect(names()).toEqual(['Ayele Fulasa']))
    expect(api.catalogQueries.at(-1)).toMatchObject({
      roasterId: 'r2',
      mine: 'true',
    })
  })

  it('says when nobody added a coffee from it yet', async () => {
    const { page } = await roaster()

    expect(page.get(tid('roaster-coffees-empty')).text()).toBe(
      'Nobody has added a coffee from this roaster yet.',
    )
  })

  it('opens the roaster editor for the person who added it', async () => {
    const { page } = await roaster()

    expect(page.find(tid('roaster-edit')).exists()).toBe(true)
  })

  it('is not found when the roaster does not exist', async () => {
    await mountSuspended(App, { route: '/roasters/nope' })

    expect(useError().value).toMatchObject({ statusCode: 404 })
  })
})
