import { useMutation, useQueryClient } from '@tanstack/vue-query'

function useRoasterSaved() {
  const queryClient = useQueryClient()

  return (shelfId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.shelf(shelfId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.coffees() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() }),
    ])
}

export function useRoasterUpdate() {
  const saved = useRoasterSaved()

  return useMutation({
    mutationFn: (input: {
      shelfId: string
      roasterId: string
      details: RoasterDetails
    }) =>
      $fetch(`/api/roasters/${input.roasterId}`, {
        method: 'PATCH',
        body: input.details,
      }),
    onSuccess: (_data, input) => saved(input.shelfId),
  })
}

function logoPath(roasterId: string) {
  return `/api/roasters/${roasterId}/logo`
}

export function useRoasterLogoUpdate() {
  const saved = useRoasterSaved()

  return useMutation({
    mutationFn: async (input: {
      shelfId: string
      roasterId: string
      logo: Blob
    }) => {
      const body = new FormData()
      body.append('photo', await compressPhoto(input.logo))

      return $fetch(logoPath(input.roasterId), { method: 'PUT', body })
    },
    onSuccess: (_data, input) => saved(input.shelfId),
  })
}

export function useRoasterLogoRemoval() {
  const saved = useRoasterSaved()

  return useMutation({
    mutationFn: (input: { shelfId: string; roasterId: string }) =>
      $fetch(logoPath(input.roasterId), { method: 'DELETE' }),
    onSuccess: (_data, input) => saved(input.shelfId),
  })
}
