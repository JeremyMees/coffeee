import type { Ref } from 'vue'

export interface QueryState<Data> {
  data: Readonly<Ref<Data | undefined>>
  isError: Readonly<Ref<boolean>>
  fetchStatus: Readonly<Ref<'fetching' | 'paused' | 'idle'>>
  refetch: () => unknown
}
