import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { clearError, useCurrentUser, useError } from '#imports'
import { testUser } from '#test/fixtures/users'

beforeEach(() => {
  clearError()
  useCurrentUser().value = testUser()
})

describe('a shelf someone is not a member of', () => {
  it('is not found', async () => {
    await mountSuspended(App, { route: '/shelves/someone-else' }).catch(
      () => {},
    )

    expect(useError().value).toMatchObject({
      statusCode: 404,
      statusMessage: 'Shelf not found',
    })
  })

  it('lets members through', async () => {
    await mountSuspended(App, { route: '/shelves/work' })

    expect(useError().value).toBeUndefined()
  })
})
