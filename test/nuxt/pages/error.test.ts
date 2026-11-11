import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createError } from 'h3'
import ErrorPage from '~/error.vue'
import { useCurrentUser } from '#imports'
import { tid } from '../fixtures'
import { testUser } from '#test/fixtures/users'

const { clearError } = vi.hoisted(() => ({ clearError: vi.fn() }))

mockNuxtImport('clearError', () => clearError)

beforeEach(() => {
  useCurrentUser().value = null
})

describe('error page', () => {
  it('never repeats the path or the server message of a missing page', async () => {
    const page = await mountSuspended(ErrorPage, {
      props: {
        error: createError({
          statusCode: 404,
          statusMessage: 'Page not found: /this-page-does-not-exist',
        }),
      },
    })

    expect(page.get(tid('error-title')).text()).toBe('Not found')
    expect(page.get(tid('error-message')).text()).toBe(
      "That page doesn't exist or you don't have access to it.",
    )
    expect(page.text()).not.toContain('/this-page-does-not-exist')
  })

  it('keeps the navigation for a signed-in user', async () => {
    useCurrentUser().value = testUser()

    const page = await mountSuspended(ErrorPage, {
      props: { error: createError({ statusCode: 404 }) },
    })

    expect(page.find(tid('sidebar')).exists()).toBe(true)
    expect(page.find(tid('dock')).exists()).toBe(true)
  })

  it('stands alone for a signed-out visitor', async () => {
    const page = await mountSuspended(ErrorPage, {
      props: { error: createError({ statusCode: 404 }) },
    })

    expect(page.find(tid('sidebar')).exists()).toBe(false)
    expect(page.find(tid('dock')).exists()).toBe(false)
  })

  it('keeps other errors vague', async () => {
    const page = await mountSuspended(ErrorPage, {
      props: {
        error: createError({ statusCode: 500, statusMessage: 'pg: timeout' }),
      },
    })

    expect(page.get(tid('error-title')).text()).toBe('Something broke')
    expect(page.get(tid('error-message')).text()).toBe('Try again in a moment.')
  })

  it('goes back to the shelf', async () => {
    const page = await mountSuspended(ErrorPage, {
      props: { error: createError({ statusCode: 404 }) },
    })

    await page.get(tid('error-back')).trigger('click')

    expect(clearError).toHaveBeenCalledWith({ redirect: '/' })
  })
})
