import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { useAddCoffee, useCurrentUser, useRouter } from '#imports'
import {
  byTestId,
  click,
  currentPath,
  forgetLastShelf,
  inputValue,
  rememberShelf,
} from '../fixtures'
import { testUser } from '#test/fixtures/users'

beforeEach(() => {
  forgetLastShelf()
  rememberShelf('work')
  useCurrentUser().value = testUser()
  useAddCoffee().value = false
})

async function share(query: Record<string, string>) {
  await mountSuspended(App, {
    route: `/share?${new URLSearchParams(query)}`,
  })
  await flushPromises()
}

async function linkField() {
  return vi.waitFor(() => {
    if (!byTestId('coffee-link')) throw new Error('No link field yet')

    return inputValue('coffee-link')
  })
}

describe('sharing into Coffeee', () => {
  it('opens add coffee on the last shelf with the shared link', async () => {
    await share({ url: 'https://roaster.example/ayele' })

    expect(currentPath()).toBe('/shelves/work-work')
    expect(useAddCoffee().value).toBe(true)
    expect(await linkField()).toBe('https://roaster.example/ayele')
  })

  it('finds the link inside shared text', async () => {
    await share({
      title: 'Ayele',
      text: 'Ayele from the roaster https://roaster.example/ayele',
    })

    expect(await linkField()).toBe('https://roaster.example/ayele')
  })

  it('opens the app as usual when nothing shared is a web address', async () => {
    await share({ title: 'Ayele', text: 'A washed Ethiopian' })

    expect(currentPath()).toBe('/shelves/work-work')
    expect(useAddCoffee().value).toBe(false)
  })

  it('forgets the shared link once add coffee closes', async () => {
    await share({ url: 'https://roaster.example/ayele' })
    await linkField()

    await click('form-sheet-close')
    useAddCoffee().value = true
    await flushPromises()

    expect(await linkField()).toBe('')
  })

  it('keeps the shared link through signing in', async () => {
    useCurrentUser().value = null

    await share({ url: 'https://roaster.example/ayele' })

    const { path, query } = useRouter().currentRoute.value

    expect(path).toBe('/sign-in')

    useCurrentUser().value = testUser()
    await useRouter().push(String(query.redirect))
    await flushPromises()

    expect(currentPath()).toBe('/shelves/work-work')
    expect(await linkField()).toBe('https://roaster.example/ayele')
  })
})
