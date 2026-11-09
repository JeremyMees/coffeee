import { onlineManager } from '@tanstack/vue-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import {
  clearError,
  coffeePath,
  roasterPath,
  shelfCoffeePath,
  useError,
  useRouter,
} from '#imports'
import type { Member } from '#test/support/types'
import { click, currentPath, forgetLastShelf, tid } from '../../fixtures'
import { failRequest, holdRequest, scenario, signIn } from '../../server'

let sarah: Member
let squareMile: { id: string; name: string }

beforeEach(async () => {
  forgetLastShelf()
  clearError()
  sarah = await scenario.member('Sarah')
  const id = await scenario.roaster(sarah, 'Square Mile')
  await scenario.roasterDetails(sarah, id, {
    name: 'Square Mile',
    website: 'https://www.squaremilecoffee.com',
    countryCode: 'GB',
    city: 'London',
  })
  squareMile = { id, name: 'Square Mile' }
  await signIn(sarah)
})

afterEach(() => onlineManager.setOnline(true))

function openRoaster(route = roasterPath(squareMile)) {
  return mountSuspended(App, { route, attachTo: document.body })
}

async function roaster() {
  const page = await openRoaster()
  await vi.waitFor(() =>
    expect(page.find('[data-testid$="-skeleton"]').exists()).toBe(false),
  )

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
      `view-transition-name: roaster-name-${squareMile.id}`,
    )
    expect(page.get(tid('roaster-logo')).attributes('style')).toContain(
      `view-transition-name: roaster-logo-${squareMile.id}`,
    )
  })

  it('shows its details and leads back to the roasters', async () => {
    const { page } = await roaster()

    expect(page.get(tid('roaster-title')).text()).toBe('Square Mile')
    expect(page.get(tid('roaster-place')).text()).toBe('London, United Kingdom')
    expect(page.get(tid('roaster-website')).attributes('href')).toBe(
      'https://www.squaremilecoffee.com/?utm_source=coffeee&utm_medium=referral',
    )
    expect(page.get(tid('roaster-logo-placeholder')).text()).toBe('S')
    expect(page.get(tid('roaster-back')).attributes('href')).toBe('/roasters')
  })

  it('lists every coffee from it, opening the shelf’s own on the shelf', async () => {
    const tom = await scenario.member('Tom')
    const ayele = await scenario.coffee(sarah.shelf)
    const redBrick = await scenario.coffee(
      tom.shelf,
      { name: 'Red Brick' },
      tom,
    )
    await scenario.coffee(sarah.shelf, {
      name: 'Bombe',
      roaster: 'La Cabra',
    })

    const { page, names } = await roaster()

    expect(names()).toEqual(['Red Brick', 'Ayele Fulasa'])
    expect(
      page
        .findAll(tid('catalog-result'))
        .map(result => result.attributes('href')),
    ).toEqual([coffeePath(redBrick), shelfCoffeePath(sarah.shelf, ayele)])
    expect(page.findAll(tid('catalog-result-mine'))).toHaveLength(1)
  })

  it('keeps only the shelf’s own coffees with Mine', async () => {
    const tom = await scenario.member('Tom')
    await scenario.coffee(sarah.shelf)
    await scenario.coffee(tom.shelf, { name: 'Red Brick' }, tom)
    const { names } = await roaster()
    expect(names()).toEqual(['Red Brick', 'Ayele Fulasa'])

    await click('roaster-filter-mine')

    await vi.waitFor(() => expect(names()).toEqual(['Ayele Fulasa']))
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

    await vi.waitFor(() =>
      expect(useError().value).toMatchObject({ statusCode: 404 }),
    )
  })

  it('sends an outdated slug on to the current one', async () => {
    await mountSuspended(App, { route: `/roasters/old-name-${squareMile.id}` })

    await vi.waitFor(() => expect(currentPath()).toBe(roasterPath(squareMile)))
  })
})

describe('a roaster page that loads per section', () => {
  const sections = [
    {
      name: 'roaster',
      path: () => `/api/roasters/${squareMile.id}`,
      skeleton: 'roaster-header-skeleton',
      content: 'roaster-place',
      error: 'roaster',
    },
    {
      name: 'catalog',
      path: () => `/api/shelves/${sarah.shelf.id}/catalog`,
      skeleton: 'roaster-coffees-skeleton',
      content: 'roaster-coffees',
      error: 'roaster-coffees',
    },
  ]

  beforeEach(async () => {
    await scenario.coffee(sarah.shelf)
  })

  it.each(sections)(
    'shows a skeleton for the $name until its request finishes',
    async ({ path, skeleton, content }) => {
      const hold = holdRequest('GET', path())

      const page = await openRoaster()
      const other = sections.find(section => section.skeleton !== skeleton)!
      await vi.waitFor(() =>
        expect(page.find(tid(other.content)).exists()).toBe(true),
      )

      expect(page.find(tid(skeleton)).exists()).toBe(true)
      expect(page.find(tid(content)).exists()).toBe(false)

      hold.release()

      await vi.waitFor(() =>
        expect(page.find(tid(content)).exists()).toBe(true),
      )
      expect(page.find(tid(skeleton)).exists()).toBe(false)
    },
  )

  it.each(sections)(
    'shows an error and a retry for the $name and keeps the rest of the page',
    async ({ path, skeleton, content, error }) => {
      const lift = failRequest('GET', path(), { status: 403, message: 'Nope' })

      const page = await openRoaster()
      await vi.waitFor(() =>
        expect(page.find(tid(`${error}-error`)).exists()).toBe(true),
      )

      expect(page.find(tid(skeleton)).exists()).toBe(false)
      const other = sections.find(section => section.error !== error)!
      await vi.waitFor(() =>
        expect(page.find(tid(other.content)).exists()).toBe(true),
      )

      lift()
      await page.get(tid(`${error}-retry`)).trigger('click')

      await vi.waitFor(() =>
        expect(page.find(tid(content)).exists()).toBe(true),
      )
      expect(page.find(tid(`${error}-error`)).exists()).toBe(false)
    },
  )

  it('shows the name and logo at once when opened from the roasters', async () => {
    const page = await openRoaster('/roasters')
    await vi.waitFor(() =>
      expect(page.find(tid('roaster-result')).exists()).toBe(true),
    )
    const hold = holdRequest('GET', `/api/roasters/${squareMile.id}`)

    await useRouter().push(roasterPath(squareMile))

    await vi.waitFor(() =>
      expect(page.get(tid('roaster-title')).text()).toBe('Square Mile'),
    )
    expect(page.find(tid('roaster-logo')).exists()).toBe(true)
    expect(page.find(tid('roaster-skeleton')).exists()).toBe(true)
    expect(page.find(tid('roaster-edit')).exists()).toBe(false)
    await vi.waitFor(() =>
      expect(page.find(tid('roaster-coffees')).exists()).toBe(true),
    )

    hold.release()

    await vi.waitFor(() =>
      expect(page.find(tid('roaster-place')).exists()).toBe(true),
    )
    expect(page.find(tid('roaster-edit')).exists()).toBe(true)
  })

  it('says each section is offline instead of showing skeletons that never end', async () => {
    onlineManager.setOnline(false)

    const page = await openRoaster()

    for (const { error, skeleton } of sections) {
      await vi.waitFor(() =>
        expect(page.find(tid(`${error}-offline`)).exists()).toBe(true),
      )
      expect(page.find(tid(skeleton)).exists()).toBe(false)
    }
  })
})
