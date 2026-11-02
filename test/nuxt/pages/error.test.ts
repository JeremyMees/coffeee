import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createError } from 'h3'
import ErrorPage from '~/error.vue'
import { tid } from '../fixtures'

const { clearError } = vi.hoisted(() => ({ clearError: vi.fn() }))

mockNuxtImport('clearError', () => clearError)

describe('error page', () => {
  it('says what was not found', async () => {
    const page = await mountSuspended(ErrorPage, {
      props: {
        error: createError({
          statusCode: 404,
          statusMessage: 'Shelf not found',
        }),
      },
    })

    expect(page.get(tid('error-title')).text()).toBe('Not found')
    expect(page.get(tid('error-message')).text()).toBe('Shelf not found')
  })

  it('says there is nothing here when it does not know what is missing', async () => {
    const page = await mountSuspended(ErrorPage, {
      props: { error: createError({ statusCode: 404 }) },
    })

    expect(page.get(tid('error-message')).text()).toBe('There is nothing here.')
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
