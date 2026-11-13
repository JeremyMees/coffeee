export function useInstall() {
  const hydrated = useHydrated()
  const { $pwa } = useNuxtApp()

  const userAgent = computed(() => (hydrated.value ? navigator.userAgent : ''))
  const installed = computed(
    () => hydrated.value && Boolean($pwa?.isPWAInstalled),
  )
  const canPrompt = computed(
    () =>
      hydrated.value && !installed.value && Boolean($pwa?.showInstallPrompt),
  )
  const needsSteps = computed(
    () => !installed.value && isIPhone(userAgent.value),
  )
  const phone = computed(() => isPhone(userAgent.value))
  const offered = computed(() => canPrompt.value || needsSteps.value)

  async function install() {
    await $pwa?.install()
  }

  return { installed, canPrompt, needsSteps, phone, offered, install }
}
