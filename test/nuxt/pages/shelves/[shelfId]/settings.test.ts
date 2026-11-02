import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { useCurrentUser } from '#imports'
import { fakeApi, resetApi } from '../../../fake-api'
import { testUser, tid } from '../../../fixtures'

fakeApi()

beforeEach(() => {
  resetApi()
  useCurrentUser().value = testUser()
})

describe('the shelf settings page', () => {
  it('shows the grinders the shelf owns', async () => {
    const page = await mountSuspended(App, { route: '/shelves/home/settings' })

    expect(page.get(tid('page-title')).text()).toBe('Settings')
    expect(page.get(tid('shelf-grinder-name')).text()).toBe('Fellow Opus Gen 2')
  })
})
