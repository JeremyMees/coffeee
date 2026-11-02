import { useMutation, useQueryClient } from '@tanstack/vue-query'

export function useVerdictUpdate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: {
      shelfId: string
      coffeeId: string
      verdict: VerdictChange
    }) =>
      $fetch(
        `/api/shelves/${input.shelfId}/coffees/${input.coffeeId}/verdict`,
        { method: 'PATCH', body: input.verdict },
      ),
    onSuccess: (_data, input) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.shelf(input.shelfId),
      }),
  })
}
