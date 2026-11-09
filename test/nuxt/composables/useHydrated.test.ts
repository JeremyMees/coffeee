import { afterEach, describe, expect, it } from 'vitest'
import { useHydrated } from '#imports'

afterEach(() => {
  useNuxtApp().isHydrating = false
})

describe('useHydrated', () => {
  it('is hydrated straight away once the app finished hydrating', () => {
    expect(useHydrated().value).toBe(true)
  })

  it('waits for the app to finish hydrating', async () => {
    const nuxtApp = useNuxtApp()
    nuxtApp.isHydrating = true

    const hydrated = useHydrated()

    expect(hydrated.value).toBe(false)

    nuxtApp.isHydrating = false
    await nuxtApp.callHook('app:suspense:resolve')

    expect(hydrated.value).toBe(true)
  })
})
