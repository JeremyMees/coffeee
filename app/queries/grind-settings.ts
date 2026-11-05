import { useMutation } from '@tanstack/vue-query'

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
