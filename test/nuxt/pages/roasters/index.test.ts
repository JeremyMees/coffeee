import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { roasterPath } from '#imports'
import type { Member } from '#test/support/types'
import { click, forgetLastShelf, tid } from '../../fixtures'
import { scenario, signIn } from '../../server'

let sarah: Member

beforeEach(async () => {
  forgetLastShelf()
  sarah = await scenario.member('Sarah')
  await signIn(sarah)
})

async function laCabra() {
  const id = await scenario.roaster(sarah, 'La Cabra')
  await scenario.roasterDetails(sarah, id, {
    name: 'La Cabra',
    website: null,
    countryCode: 'DK',
    city: 'Aarhus',
  })
  await scenario.roasterLogo(id)

  return { id, name: 'La Cabra' }
}

async function twoRoasters() {
  const cabra = await laCabra()
  await scenario.coffee(sarah.shelf, { roaster: 'Square Mile' })

  return cabra
}

async function roasters() {
  const page = await mountSuspended(App, {
    route: '/roasters',
    attachTo: document.body,
  })

  return {
    page,
    names: () =>
      page.findAll(tid('roaster-result-name')).map(name => name.text()),
  }
}

describe('the roasters page', () => {
  it('lists every roaster of the catalog for the current shelf', async () => {
    const cabra = await twoRoasters()

    const { page, names } = await roasters()

    expect(page.get(tid('page-title')).text()).toBe('Roasters')
    expect(names()).toEqual(['La Cabra', 'Square Mile'])
    expect(page.get(tid('roasters-total')).text()).toBe('2 roasters')
    expect(page.get(tid('roaster-result')).attributes('href')).toBe(
      roasterPath(cabra),
    )
  })

  it('keeps only the roasters the shelf bought from', async () => {
    await twoRoasters()
    const { page, names } = await roasters()

    await click('roasters-filter-bought-from')

    await vi.waitFor(() => expect(names()).toEqual(['Square Mile']))
    expect(
      page.get(tid('roasters-filter-bought-from')).attributes('aria-pressed'),
    ).toBe('true')
  })

  it('says when there are no roasters yet', async () => {
    const { page } = await roasters()

    expect(page.get(tid('roasters-empty')).text()).toBe(
      'Nobody has added a roaster yet.',
    )
  })

  it('says when the shelf has not bought from any roaster', async () => {
    await laCabra()
    const { page } = await roasters()

    await click('roasters-filter-bought-from')

    await vi.waitFor(() =>
      expect(page.get(tid('roasters-empty')).text()).toBe(
        'Your shelf has not bought from any roaster yet.',
      ),
    )
  })
})
