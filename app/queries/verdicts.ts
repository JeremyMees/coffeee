import { useMutation, useQueryClient } from '@tanstack/vue-query'

export function useVerdictUpdate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { coffeeId: string; verdict: VerdictChange }) =>
      $fetch(`/api/coffees/${input.coffeeId}/verdict`, {
        method: 'PATCH',
        body: input.verdict,
      }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.shelves() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.coffees() }),
      ]),
  })
}
