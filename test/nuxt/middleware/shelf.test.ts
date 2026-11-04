import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { clearError, useCurrentUser, useError, useRouter } from '#imports'
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
    await mountSuspended(App, { route: '/shelves/work-work' })

    expect(useError().value).toBeUndefined()
  })
})

describe('the address of a shelf', () => {
  function currentFullPath() {
    return useRouter().currentRoute.value.fullPath
  }

  it('gains the name of the shelf when opened by its id alone', async () => {
    await mountSuspended(App, { route: '/shelves/home' })

    expect(currentFullPath()).toBe('/shelves/sarahs-shelf-home')
  })

  it('follows a rename, keeping the page and its query', async () => {
    await mountSuspended(App, {
      route: '/shelves/old-name-work/library?favourites=true',
    })

    expect(currentFullPath()).toBe('/shelves/work-work/library?favourites=true')
  })
})
