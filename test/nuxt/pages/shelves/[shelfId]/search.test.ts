import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { useCurrentUser } from '#imports'
import { testUser, tid } from '../../../fixtures'

describe('the Search page', () => {
  it('has Search as its heading', async () => {
    useCurrentUser().value = testUser()

    const page = await mountSuspended(App, { route: '/shelves/home/search' })

    expect(page.get(tid('page-title')).text()).toBe('Search')
  })
})
