export function useInstall() {
  const hydrated = useHydrated()
  const onClient = computed(() => import.meta.client && hydrated.value)
  const { $pwa } = useNuxtApp()

  const userAgent = computed(() => (onClient.value ? navigator.userAgent : ''))
  const installed = computed(
    () => onClient.value && Boolean($pwa?.isPWAInstalled),
  )
  const canPrompt = computed(
    () =>
      onClient.value && !installed.value && Boolean($pwa?.showInstallPrompt),
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
