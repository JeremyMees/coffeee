import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { useCurrentUser } from '#imports'
import { api, fakeApi, resetApi } from '../../fake-api'
import { click, forgetLastShelf, tid } from '../../fixtures'
import { listedRoasters } from '#test/fixtures/roasters'
import { testUser } from '#test/fixtures/users'

fakeApi()

beforeEach(() => {
  forgetLastShelf()
  resetApi()
  useCurrentUser().value = testUser()
})

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
    api.roasters = listedRoasters()

    const { page, names } = await roasters()

    expect(page.get(tid('page-title')).text()).toBe('Roasters')
    expect(names()).toEqual(['La Cabra', 'Square Mile'])
    expect(page.get(tid('roasters-total')).text()).toBe('2 roasters')
    expect(page.get(tid('roaster-result')).attributes('href')).toBe(
      '/roasters/r1',
    )
  })

  it('keeps only the roasters the shelf bought from', async () => {
    api.roasters = listedRoasters()
    const { page, names } = await roasters()

    await click('roasters-filter-bought-from')

    await vi.waitFor(() => expect(names()).toEqual(['Square Mile']))
    expect(api.roasterQueries.at(-1)).toMatchObject({ boughtFrom: 'true' })
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
    api.roasters = [listedRoasters()[0]!]
    const { page } = await roasters()

    await click('roasters-filter-bought-from')

    await vi.waitFor(() =>
      expect(page.get(tid('roasters-empty')).text()).toBe(
        'Your shelf has not bought from any roaster yet.',
      ),
    )
  })
})
