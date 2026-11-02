import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'

export function useBrewMethods() {
  const request = useRequestFetch()

  return useQuery({
    queryKey: queryKeys.brewMethods(),
    queryFn: () => request('/api/brew-methods'),
    staleTime: 10 * 60 * 1000,
  })
}

export function useBrewMethodCreate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (brewMethod: NewBrewMethod) =>
      $fetch('/api/brew-methods', { method: 'POST', body: brewMethod }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.brewMethods() }),
  })
}
