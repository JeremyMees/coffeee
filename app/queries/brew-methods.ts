import { useQuery } from '@tanstack/vue-query'

export function useBrewMethods() {
  const request = useRequestFetch()

  return useQuery({
    queryKey: queryKeys.brewMethods(),
    queryFn: () => request('/api/brew-methods'),
    staleTime: 10 * 60 * 1000,
  })
}
