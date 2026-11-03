import type { MaybeRefOrGetter } from 'vue'

export interface BackLink {
  label: string
  to: string
}

export function useBackLink(fallback: MaybeRefOrGetter<BackLink>) {
  const destinations = useDestinations()
  const router = useRouter()
  const previous = ref<string | null>(null)

  onMounted(() => {
    const back = window.history.state?.back

    previous.value = typeof back === 'string' ? back : null
  })

  const origin = computed<BackLink | null>(() => {
    if (!previous.value) return null

    const path = previous.value.split(/[?#]/)[0]
    const destination = destinations.value.find(({ to }) => to === path)

    if (destination) return { label: destination.label, to: previous.value }
    if (path?.startsWith('/roasters/')) {
      return { label: 'Roaster', to: previous.value }
    }
    if (path && /^(\/shelves\/[^/]+)?\/coffees\/[^/]+$/.test(path)) {
      return { label: 'Coffee', to: previous.value }
    }

    return null
  })

  const link = computed(() => origin.value ?? toValue(fallback))

  function back(event: MouseEvent) {
    if (!origin.value || event.metaKey || event.ctrlKey || event.shiftKey) {
      return
    }

    event.preventDefault()
    router.back()
  }

  return { link, back }
}
