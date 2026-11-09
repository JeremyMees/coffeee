import { afterEach, describe, expect, it, vi } from 'vitest'
import { timeoutManager, useQueryClient } from '@tanstack/vue-query'
import { useNuxtApp } from '#imports'

function queryClient() {
  return useNuxtApp().vueApp.runWithContext(() => useQueryClient())
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the vue-query plugin', () => {
  it('retries a failing server twice but never a refused request', () => {
    const retry = queryClient().getDefaultOptions().queries!.retry as (
      failures: number,
      error: unknown,
    ) => boolean

    expect(retry(0, { statusCode: 500 })).toBe(true)
    expect(retry(1, new Error('offline'))).toBe(true)
    expect(retry(2, { statusCode: 500 })).toBe(false)
    expect(retry(0, { statusCode: 404 })).toBe(false)
  })

  it('forgets the queries of a page once it is rendered', async () => {
    const client = queryClient()
    client.setQueryData(['stock', 'home'], ['Ayele Fulasa'])

    await useNuxtApp().hooks.callHook('app:rendered', {} as never)

    expect(client.getQueryCache().getAll()).toEqual([])
  })

  it('lets a server exit while query timers are pending', () => {
    const unref = vi.fn()
    vi.stubGlobal(
      'setTimeout',
      vi.fn(() => ({ unref })),
    )
    vi.stubGlobal(
      'setInterval',
      vi.fn(() => ({ unref })),
    )
    vi.stubGlobal('clearTimeout', vi.fn())
    vi.stubGlobal('clearInterval', vi.fn())

    const timeout = timeoutManager.setTimeout(() => {}, 10)
    const interval = timeoutManager.setInterval(() => {}, 10)
    timeoutManager.clearTimeout(timeout)
    timeoutManager.clearInterval(interval)

    expect(unref).toHaveBeenCalledTimes(2)
    expect(clearTimeout).toHaveBeenCalledWith(timeout)
    expect(clearInterval).toHaveBeenCalledWith(interval)
  })
})
