import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DehydratedState } from '@tanstack/vue-query'
import {
  dehydrate,
  QueryClient,
  timeoutManager,
  useQueryClient,
} from '@tanstack/vue-query'
import { useNuxtApp, useState } from '#imports'

function queryClient() {
  return useNuxtApp().vueApp.runWithContext(() => useQueryClient())
}

function queryState() {
  return useState<DehydratedState | null>('vue-query')
}

afterEach(() => {
  vi.unstubAllGlobals()
  queryState().value = null
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

  it('hands the rendered queries to the browser and forgets them', async () => {
    const client = queryClient()
    client.setQueryData(['stock', 'home'], ['Ayele Fulasa'])

    await useNuxtApp().hooks.callHook('app:rendered', {} as never)

    expect(queryState().value?.queries).toEqual([
      expect.objectContaining({
        queryKey: ['stock', 'home'],
        state: expect.objectContaining({ data: ['Ayele Fulasa'] }),
      }),
    ])
    expect(client.getQueryData(['stock', 'home'])).toBeUndefined()
  })

  it('picks up the queries the server rendered', async () => {
    const server = new QueryClient()
    server.setQueryData(['stock', 'home'], ['Ayele Fulasa'])
    queryState().value = dehydrate(server)

    await useNuxtApp().hooks.callHook('app:created', useNuxtApp().vueApp)

    expect(queryClient().getQueryData(['stock', 'home'])).toEqual([
      'Ayele Fulasa',
    ])
  })

  it('has nothing to pick up when the server rendered no queries', async () => {
    await useNuxtApp().hooks.callHook('app:created', useNuxtApp().vueApp)

    expect(queryClient().getQueryCache().getAll()).toEqual([])
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
