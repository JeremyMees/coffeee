import { useMutation } from '@tanstack/vue-query'

export function useVerdictUpdate() {
  const changed = useChanged()

  return useMutation({
    mutationFn: (input: { coffeeId: string; verdict: VerdictChange }) =>
      $fetch(`/api/coffees/${input.coffeeId}/verdict`, {
        method: 'PATCH',
        body: input.verdict,
      }),
    onSuccess: () => changed({ type: 'verdict' }),
  })
}
