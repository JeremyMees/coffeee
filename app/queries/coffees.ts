import { useMutation, useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'

export function useStock(shelfId: MaybeRefOrGetter<string>) {
  const request = useRequestFetch()

  return useQuery({
    queryKey: computed(() => queryKeys.stock(toValue(shelfId))),
    queryFn: () => request(`/api/shelves/${toValue(shelfId)}/stock`),
    enabled: import.meta.client,
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
  const changed = useChanged()

  return () => changed({ type: 'coffee' })
}

export function useCoffeeCreate() {
  const saved = useCoffeeSaved()

  return useMutation({
    mutationFn: (input: { shelfId: string; coffee: NewCoffee }) =>
      $fetch(`/api/shelves/${input.shelfId}/coffees`, {
        method: 'POST',
        body: input.coffee,
      }),
    onSuccess: saved,
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
    onSuccess: saved,
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
    onSuccess: saved,
  })
}

export function useCoffeePhotoRemoval() {
  const saved = useCoffeeSaved()

  return useMutation({
    mutationFn: (input: { shelfId: string; coffeeId: string }) =>
      $fetch(photoPath(input), { method: 'DELETE' }),
    onSuccess: saved,
  })
}

export function useCoffeeDelete() {
  const saved = useCoffeeSaved()

  return useMutation({
    mutationFn: (coffeeId: string) =>
      $fetch(`/api/coffees/${coffeeId}`, { method: 'DELETE' }),
    onSuccess: saved,
  })
}
