import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { useCurrentUser, useRouter } from '#imports'
import { api, fakeApi, resetApi } from '../../fake-api'
import { testUser, tid } from '../../fixtures'

fakeApi()

beforeEach(() => {
  resetApi()
  useCurrentUser().value = testUser({ role: 'admin' })
})

function names(page: VueWrapper) {
  return page.findAll(tid('brew-method')).map(method => method.text())
}

describe('the brew methods page', () => {
  it('lists the brew methods', async () => {
    const page = await mountSuspended(App, { route: '/admin/brew-methods' })

    expect(page.get(tid('brew-methods-title')).text()).toBe('Brew methods')
    expect(names(page)).toEqual(['Espresso', 'Pour over'])
  })

  it('lets an admin add a brew method', async () => {
    const page = await mountSuspended(App, { route: '/admin/brew-methods' })

    await page.get(tid('brew-method-name')).setValue('Siphon')
    await page.get(tid('brew-method-form')).trigger('submit')

    await vi.waitFor(() =>
      expect(names(page)).toEqual(['Espresso', 'Pour over', 'Siphon']),
    )
    expect(api.brewMethodCalls).toEqual([{ name: 'Siphon' }])
    expect(
      page.get<HTMLInputElement>(tid('brew-method-name')).element.value,
    ).toBe('')
  })

  it('explains a brew method that is already on the list', async () => {
    const page = await mountSuspended(App, { route: '/admin/brew-methods' })

    await page.get(tid('brew-method-name')).setValue('Espresso')
    await page.get(tid('brew-method-form')).trigger('submit')

    await vi.waitFor(() =>
      expect(page.get(tid('brew-method-form')).text()).toContain(
        'Espresso is already a brew method',
      ),
    )
    expect(page.find(tid('form-error')).exists()).toBe(false)
  })

  it('sends users who are not admins home', async () => {
    useCurrentUser().value = testUser()
    await mountSuspended(App, { route: '/profile' })

    await useRouter().push('/admin/brew-methods')

    await vi.waitFor(() =>
      expect(useRouter().currentRoute.value.path).toBe('/shelves/home'),
    )
  })
})
