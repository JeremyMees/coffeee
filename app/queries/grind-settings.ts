import { useMutation, useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'

export function useShelfGrindSettings(
  shelfId: MaybeRefOrGetter<string>,
  coffeeId: MaybeRefOrGetter<string>,
) {
  const request = useRequestFetch()

  return useQuery({
    queryKey: computed(() =>
      queryKeys.shelfCoffeeGrindSettings(toValue(shelfId), toValue(coffeeId)),
    ),
    queryFn: () =>
      request(
        `/api/shelves/${toValue(shelfId)}/coffees/${toValue(coffeeId)}/grind-settings`,
      ),
    enabled: import.meta.client,
  })
}

export function useGrindSettingSave() {
  const changed = useChanged()

  return useMutation({
    mutationFn: (input: {
      shelfId: string
      coffeeId: string
      change: GrindSettingChange
    }) =>
      $fetch(
        `/api/shelves/${input.shelfId}/coffees/${input.coffeeId}/grind-settings`,
        { method: 'PUT', body: input.change },
      ),
    onSuccess: () => changed({ type: 'grindSetting' }),
  })
}
