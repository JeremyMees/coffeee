import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { clearError, coffeePath, roasterPath, useError } from '#imports'
import type { Member } from '#test/support/types'
import { click, forgetLastShelf, tid } from '../../fixtures'
import { scenario, signIn } from '../../server'

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

async function roaster() {
  const page = await mountSuspended(App, {
    route: roasterPath(squareMile),
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
      'https://www.squaremilecoffee.com',
    )
    expect(page.get(tid('roaster-logo-placeholder')).text()).toBe('S')
    expect(page.get(tid('roaster-back')).attributes('href')).toBe('/roasters')
  })

  it('lists every coffee from it, each opening its own page', async () => {
    const ayele = await scenario.coffee(sarah.shelf)
    await scenario.coffee(sarah.shelf, {
      name: 'Red Brick',
      roaster: 'La Cabra',
    })

    const { page, names } = await roaster()

    expect(names()).toEqual(['Ayele Fulasa'])
    expect(page.get(tid('catalog-result')).attributes('href')).toBe(
      coffeePath(ayele),
    )
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

    expect(useError().value).toMatchObject({ statusCode: 404 })
  })
})
