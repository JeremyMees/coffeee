import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createError } from 'h3'
import ErrorPage from '~/error.vue'

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

    expect(page.get('h1').text()).toBe('Not found')
    expect(page.text()).toContain('Shelf not found')
  })

  it('keeps other errors vague', async () => {
    const page = await mountSuspended(ErrorPage, {
      props: {
        error: createError({ statusCode: 500, statusMessage: 'pg: timeout' }),
      },
    })

    expect(page.get('h1').text()).toBe('Something broke')
    expect(page.text()).not.toContain('pg: timeout')
  })

  it('goes back to the shelf', async () => {
    const page = await mountSuspended(ErrorPage, {
      props: { error: createError({ statusCode: 404 }) },
    })

    await page.get('button').trigger('click')

    expect(clearError).toHaveBeenCalledWith({ redirect: '/' })
  })
})
