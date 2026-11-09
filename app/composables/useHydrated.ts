export function useHydrated() {
  const nuxtApp = useNuxtApp()
  const hydrated = ref(!nuxtApp.isHydrating)

  if (!hydrated.value) {
    nuxtApp.hooks.hookOnce('app:suspense:resolve', () => {
      hydrated.value = true
    })
  }

  return readonly(hydrated)
}
