import type { MaybeRefOrGetter } from 'vue'
import { useFilterLabels } from '~/queries/filters'

export function useBrowsingAddress<State extends { filter: BrowsingFilter }>(
  shelfId: MaybeRefOrGetter<string>,
  address: BrowsingAddress<State>,
) {
  const route = useRoute()
  const query = route.query
  const labels = useFilterLabels(shelfId, labelIds(query))
  const initial = address.fromRoute(query, labels.data.value)

  function whenNamed(name: (filter: State['filter']) => void) {
    if (labels.data.value) return

    const stop = watch(labels.data, known => {
      if (!known) return

      stop()
      name(address.fromRoute(query, known).filter)
    })
  }

  function keep(state: State) {
    const query = address.toRoute(state)

    if (labels.data.value) labels.remember(query, address.labelsOf(state))

    return navigateTo({ query }, { replace: true })
  }

  return { initial, labels, whenNamed, keep }
}
