export function useTab<T extends string>(tabs: readonly [T, ...T[]]) {
  const route = useRoute()
  const router = useRouter()
  const [first] = tabs

  return computed<T>({
    get() {
      const tab = route.query.tab

      return tabs.find(found => found === tab) ?? first
    },
    set(tab) {
      const { tab: _, ...query } = route.query

      router.replace({ query: tab === first ? query : { ...query, tab } })
    },
  })
}
