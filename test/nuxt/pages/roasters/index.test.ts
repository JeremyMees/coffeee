import { onlineManager } from '@tanstack/vue-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { roasterPath } from '#imports'
import type { Member } from '#test/support/types'
import {
  byTestId,
  click,
  forgetLastShelf,
  submit,
  tid,
  type,
} from '../../fixtures'
import { failRequest, holdRequest, scenario, signIn } from '../../server'

let sarah: Member

beforeEach(async () => {
  forgetLastShelf()
  sarah = await scenario.member('Sarah')
  await signIn(sarah)
})

afterEach(() => onlineManager.setOnline(true))

function listPath() {
  return `/api/shelves/${sarah.shelf.id}/roasters`
}

function mount() {
  return mountSuspended(App, { route: '/roasters', attachTo: document.body })
}

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
  const page = await mount()
  await vi.waitFor(() =>
    expect(page.find(tid('roasters-skeleton')).exists()).toBe(false),
  )

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

  it('adds a roaster from the button in the header and lists it', async () => {
    const { page, names } = await roasters()

    expect(page.get(tid('page-add')).text()).toBe('Add roaster')
    await click('page-add')
    await vi.waitFor(() => expect(byTestId('roaster-name')).not.toBeNull())
    await type('roaster-name', 'La Cabra')
    await submit('add-roaster-form')

    await vi.waitFor(() => expect(names()).toEqual(['La Cabra']))
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
  it('shows the page and a skeleton while the roasters load', async () => {
    await twoRoasters()
    const hold = holdRequest('GET', listPath())

    const page = await mount()

    expect(page.get(tid('page-title')).text()).toBe('Roasters')
    expect(page.find(tid('roasters-skeleton')).exists()).toBe(true)
    expect(page.find(tid('roasters')).exists()).toBe(false)

    hold.release()

    await vi.waitFor(() =>
      expect(page.findAll(tid('roaster-result'))).toHaveLength(2),
    )
    expect(page.find(tid('roasters-skeleton')).exists()).toBe(false)
  })

  it('shows an error with a retry when the roasters fail to load', async () => {
    await twoRoasters()
    const lift = failRequest('GET', listPath(), {
      status: 500,
      message: 'Nope',
    })

    const page = await mount()

    await vi.waitFor(() =>
      expect(page.find(tid('roasters-error')).exists()).toBe(true),
    )
    expect(page.get(tid('page-title')).text()).toBe('Roasters')
    expect(page.find(tid('roasters-skeleton')).exists()).toBe(false)

    lift()
    await page.get(tid('roasters-retry')).trigger('click')

    await vi.waitFor(() =>
      expect(page.findAll(tid('roaster-result'))).toHaveLength(2),
    )
    expect(page.find(tid('roasters-error')).exists()).toBe(false)
  })

  it('says it is offline instead of showing a skeleton forever', async () => {
    onlineManager.setOnline(false)

    const page = await mount()

    expect(page.find(tid('roasters-offline')).exists()).toBe(true)
    expect(page.find(tid('roasters-skeleton')).exists()).toBe(false)

    onlineManager.setOnline(true)
    await page.get(tid('roasters-retry')).trigger('click')

    await vi.waitFor(() =>
      expect(page.find(tid('roasters-empty')).exists()).toBe(true),
    )
  })

  it('keeps the roasters on screen with no skeleton while the filter changes', async () => {
    await twoRoasters()
    const { page, names } = await roasters()
    const hold = holdRequest('GET', listPath())

    await click('roasters-filter-bought-from')

    expect(page.find(tid('roasters-skeleton')).exists()).toBe(false)
    expect(names()).toEqual(['La Cabra', 'Square Mile'])

    hold.release()

    await vi.waitFor(() => expect(names()).toEqual(['Square Mile']))
  })
})
