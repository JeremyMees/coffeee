export function useActiveSection() {
  const destinations = useDestinations()
  const route = useRoute()
  const lastSection = useState<string | null>('last-section', () => null)

  const sections = computed(() => [
    ...destinations.value.map(({ to }) => to),
    adminPath,
  ])

  function destination(label: string) {
    return destinations.value.find(item => item.label === label)?.to ?? null
  }

  watch(
    () => route.path,
    path => {
      if (sections.value.includes(path)) lastSection.value = path
    },
    { immediate: true },
  )

  return computed(() => {
    const path = route.path

    if (sections.value.includes(path)) return path
    if (path.startsWith('/roasters/')) return destination('Roasters')
    if (path.startsWith(`${adminPath}/`)) return adminPath
    if (/^\/shelves\/[^/]+\/settings$/.test(path)) return destination('Stock')
    if (!isCoffeePath(path)) return null
    if (lastSection.value && sections.value.includes(lastSection.value)) {
      return lastSection.value
    }

    return destination(isShelfCoffeePath(path) ? 'Stock' : 'Discover')
  })
}
