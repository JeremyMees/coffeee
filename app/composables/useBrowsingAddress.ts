import type { MaybeRefOrGetter } from 'vue'
import { useFilterLabels } from '~/queries/filters'

export function useBrowsingAddress<State>(
  shelfId: MaybeRefOrGetter<string>,
  address: BrowsingAddress<State>,
) {
  const route = useRoute()
  const labels = useFilterLabels(shelfId, labelIds(route.query))

  async function start() {
    await labels.suspense()

    return address.fromRoute(route.query, labels.data.value ?? {})
  }

  function keep(state: State) {
    const query = address.toRoute(state)

    labels.remember(query, address.labelsOf(state))

    return navigateTo({ query }, { replace: true })
  }

  return { start, keep }
}
