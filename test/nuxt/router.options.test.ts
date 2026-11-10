import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { START_LOCATION } from 'vue-router'
import type { RouteLocationNormalized } from 'vue-router'
import options from '~/router.options'

const finished = vi.hoisted(() => ({ fullPath: '/stock' }))

mockNuxtImport('useRoute', () => () => finished)

beforeEach(() => {
  finished.fullPath = '/stock'
})

afterEach(() => {
  vi.restoreAllMocks()
})

function route(fullPath: string, extra: Partial<RouteLocationNormalized> = {}) {
  const [address = fullPath, hash = ''] = fullPath.split('#')

  return {
    path: address.split('?')[0],
    fullPath,
    hash: hash ? `#${hash}` : '',
    meta: {},
    ...extra,
  } as RouteLocationNormalized
}

function scroll(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  saved: { left: number; top: number } | null = null,
) {
  return options.scrollBehavior(to, from, saved)
}

async function navigate(path: string) {
  await useRouter().push(path)

  return route(useRouter().currentRoute.value.fullPath)
}

describe('the router scroll behaviour', () => {
  it('scrolls to the top before anything else hears the page finished', async () => {
    const order: string[] = []
    const scrollTo = vi
      .spyOn(window, 'scrollTo')
      .mockImplementation(() => order.push('scrolled'))
    const stop = useNuxtApp().hook('page:finish', () => {
      order.push('heard')
    })
    const to = await navigate('/roasters')
    const position = scroll(to, route('/stock'))

    await useNuxtApp().callHook('page:finish')
    stop()

    expect(order).toEqual(['scrolled', 'heard'])
    expect(scrollTo).toHaveBeenCalledWith({ left: 0, top: 0 })
    await expect(position).resolves.toBe(false)
  })

  it('restores the saved position as soon as the new page stops loading', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const to = await navigate('/roasters')
    const position = scroll(to, route('/stock'), { left: 0, top: 640 })

    await useNuxtApp().callHook('page:loading:end')

    expect(scrollTo).toHaveBeenCalledWith({ left: 0, top: 640 })
    await expect(position).resolves.toBe(false)
  })

  it('hands a hash over to the router once the new page has finished', async () => {
    const to = route('/roasters#beans')
    finished.fullPath = '/elsewhere'
    vi.spyOn(useRouter(), 'currentRoute', 'get').mockReturnValue(
      ref(to) as never,
    )
    const position = scroll(to, route('/stock'))

    await useNuxtApp().callHook('page:finish')

    await expect(position).resolves.toEqual({ el: '#beans' })
  })

  it('leaves the scroll alone when another navigation took over', async () => {
    await navigate('/roasters')
    const position = scroll(route('/library'), route('/roasters'))

    await useNuxtApp().callHook('page:finish')

    await expect(position).resolves.toBe(false)
  })

  it('scrolls straight away when the new page finished first', () => {
    const to = route('/roasters')
    finished.fullPath = '/roasters'

    expect(scroll(to, route('/elsewhere'), { left: 0, top: 640 })).toEqual({
      left: 0,
      top: 640,
    })
  })

  it('scrolls straight away on the first page', () => {
    expect(scroll(route('/stock'), START_LOCATION)).toEqual({
      left: 0,
      top: 0,
    })
  })

  it('keeps the scroll on the same page', () => {
    expect(scroll(route('/stock?sort=name'), route('/stock'))).toBe(false)
  })

  it('jumps to a hash on the same page', () => {
    expect(scroll(route('/stock#beans'), route('/stock'))).toEqual({
      el: '#beans',
    })
  })

  it('goes back to the top when a hash is dropped', () => {
    expect(scroll(route('/stock'), route('/stock#beans'))).toEqual({
      left: 0,
      top: 0,
    })
  })

  it('stays put on pages that opt out of scrolling to the top', () => {
    expect(
      scroll(
        route('/roasters', { meta: { scrollToTop: false } }),
        route('/stock'),
      ),
    ).toBe(false)
  })
})
