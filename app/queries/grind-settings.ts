import { useMutation, useQueryClient } from '@tanstack/vue-query'

export function useGrindSettingSave() {
  const queryClient = useQueryClient()

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
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.shelves() }),
  })
}
