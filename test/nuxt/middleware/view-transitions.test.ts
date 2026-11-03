import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'
import viewTransitions from '~/middleware/view-transitions.global'

function route() {
  return { meta: {} } as RouteLocationNormalized
}

afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(document, 'startViewTransition')
})

describe('the view transitions middleware', () => {
  it('drops the fade between pages where view transitions take over', () => {
    Object.assign(document, { startViewTransition: vi.fn() })
    const to = route()

    viewTransitions(to, route())

    expect(to.meta.pageTransition).toBe(false)
  })

  it('keeps the fade between pages without view transitions', () => {
    const to = route()

    viewTransitions(to, route())

    expect(to.meta.pageTransition).toBeUndefined()
  })
})
