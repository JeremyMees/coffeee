import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'

export function useStock(shelfId: MaybeRefOrGetter<string>) {
  const request = useRequestFetch()

  return useQuery({
    queryKey: computed(() => queryKeys.stock(toValue(shelfId))),
    queryFn: () => request(`/api/shelves/${toValue(shelfId)}/stock`),
  })
}

export function useShelfCoffee(
  shelfId: MaybeRefOrGetter<string>,
  coffeeId: MaybeRefOrGetter<string>,
) {
  const request = useRequestFetch()

  return useQuery({
    queryKey: computed(() =>
      queryKeys.shelfCoffee(toValue(shelfId), toValue(coffeeId)),
    ),
    queryFn: () =>
      request(`/api/shelves/${toValue(shelfId)}/coffees/${toValue(coffeeId)}`),
  })
}

export function useCoffee(coffeeId: MaybeRefOrGetter<string>) {
  const request = useRequestFetch()

  return useQuery({
    queryKey: computed(() => queryKeys.coffee(toValue(coffeeId))),
    queryFn: () => request(`/api/coffees/${toValue(coffeeId)}`),
  })
}

function useCoffeeSaved() {
  const queryClient = useQueryClient()

  return (shelfId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.shelf(shelfId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.coffees() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() }),
    ])
}

export function useCoffeeCreate() {
  const saved = useCoffeeSaved()

  return useMutation({
    mutationFn: (input: { shelfId: string; coffee: NewCoffee }) =>
      $fetch(`/api/shelves/${input.shelfId}/coffees`, {
        method: 'POST',
        body: input.coffee,
      }),
    onSuccess: (_data, input) => saved(input.shelfId),
  })
}

export function useCoffeeUpdate() {
  const saved = useCoffeeSaved()

  return useMutation({
    mutationFn: (input: {
      shelfId: string
      coffeeId: string
      details: CoffeeDetails
    }) =>
      $fetch(`/api/shelves/${input.shelfId}/coffees/${input.coffeeId}`, {
        method: 'PATCH',
        body: input.details,
      }),
    onSuccess: (_data, input) => saved(input.shelfId),
  })
}

function photoPath(input: { shelfId: string; coffeeId: string }) {
  return `/api/shelves/${input.shelfId}/coffees/${input.coffeeId}/photo`
}

export function useCoffeePhotoUpdate() {
  const saved = useCoffeeSaved()

  return useMutation({
    mutationFn: async (input: {
      shelfId: string
      coffeeId: string
      photo: Blob
    }) => {
      const body = new FormData()
      body.append('photo', await compressPhoto(input.photo))

      return $fetch(photoPath(input), { method: 'PUT', body })
    },
    onSuccess: (_data, input) => saved(input.shelfId),
  })
}

export function useCoffeePhotoRemoval() {
  const saved = useCoffeeSaved()

  return useMutation({
    mutationFn: (input: { shelfId: string; coffeeId: string }) =>
      $fetch(photoPath(input), { method: 'DELETE' }),
    onSuccess: (_data, input) => saved(input.shelfId),
  })
}
