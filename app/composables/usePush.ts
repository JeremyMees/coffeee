import { useDocumentVisibility, useEventListener } from '@vueuse/core'

export type PushState =
  'checking' | 'needsInstall' | 'unsupported' | 'blocked' | 'off' | 'on'

export function usePush() {
  const hydrated = useHydrated()
  const onClient = computed(() => import.meta.client && hydrated.value)
  const { needsSteps, settingsPlace } = useInstall()
  const config = useRuntimeConfig()
  const permission = useState<NotificationPermission | null>(
    'push-permission',
    () => null,
  )
  const subscribed = useState<boolean | null>('push-subscribed', () => null)
  const busy = useState('push-busy', () => false)
  const supported = computed(() => onClient.value && pushSupported())

  async function refresh() {
    if (!pushSupported()) return

    permission.value = Notification.permission
    subscribed.value = Boolean(await devicePushSubscription())
  }

  const permissionStatus = shallowRef<PermissionStatus | null>(null)
  const visibility = useDocumentVisibility()

  onMounted(async () => {
    await refresh()
    permissionStatus.value = await notificationPermissionStatus()
  })

  useEventListener(permissionStatus, 'change', refresh)
  useEventListener('focus', refresh)
  watch(visibility, shown => {
    if (shown === 'visible') refresh()
  })

  const state = computed<PushState>(() => {
    if (!onClient.value) return 'checking'
    if (needsSteps.value) return 'needsInstall'
    if (!supported.value) return 'unsupported'
    if (permission.value === 'denied') return 'blocked'
    if (subscribed.value === null) return 'checking'

    return subscribed.value && permission.value === 'granted' ? 'on' : 'off'
  })

  const undecided = computed(
    () => state.value === 'off' && permission.value === 'default',
  )

  async function change(work: () => Promise<void>) {
    busy.value = true

    try {
      await work()
    } finally {
      await refresh()
      busy.value = false
    }
  }

  function turnOn() {
    return change(async () => {
      const answer = await Notification.requestPermission()
      if (answer !== 'granted') return

      await subscribeDevice(config.public.vapidPublicKey)
    })
  }

  function turnOff() {
    return change(unsubscribeDevice)
  }

  return {
    state,
    undecided,
    settingsPlace,
    busy: readonly(busy),
    turnOn,
    turnOff,
  }
}
