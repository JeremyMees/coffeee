import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import {
  useAddCoffee,
  useAddCoffeeLink,
  useCurrentUser,
  useRouter,
} from '#imports'
import { forgetLastShelf } from '../fixtures'
import { testUser } from '#test/fixtures/users'

beforeEach(() => {
  forgetLastShelf()
  useCurrentUser().value = testUser()
  useAddCoffee().value = false
  useAddCoffeeLink().value = null
})

async function visit(route: string) {
  await mountSuspended(App, { route })
  await flushPromises()

  return useRouter().currentRoute.value.fullPath
}

describe('the open-add-coffee middleware', () => {
  it('opens add coffee on a shelf and tidies the address', async () => {
    const path = await visit(
      '/shelves/work-work?add=coffee&link=https://roaster.example/ayele',
    )

    expect(path).toBe('/shelves/work-work')
    expect(useAddCoffee().value).toBe(true)
    expect(useAddCoffeeLink().value).toBe('https://roaster.example/ayele')
  })

  it('opens add coffee without a link when none came along', async () => {
    useAddCoffeeLink().value = 'https://old.example'

    await visit('/shelves/work-work/library?add=coffee')

    expect(useAddCoffee().value).toBe(true)
    expect(useAddCoffeeLink().value).toBe(null)
  })

  it('keeps the rest of the address', async () => {
    const path = await visit('/shelves/work-work/discover?add=coffee&q=gesha')

    expect(path).toBe('/shelves/work-work/discover?q=gesha')
  })

  it('leaves pages outside a shelf alone', async () => {
    const path = await visit('/profile?add=coffee')

    expect(path).toBe('/profile?add=coffee')
    expect(useAddCoffee().value).toBe(false)
  })
})
