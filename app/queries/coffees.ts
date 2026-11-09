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
    meta: { ssr: true },
  })
}

export function useCoffeeVerdict(coffeeId: MaybeRefOrGetter<string>) {
  const request = useRequestFetch()

  return useQuery({
    queryKey: computed(() => queryKeys.coffeeVerdict(toValue(coffeeId))),
    queryFn: () => request(`/api/coffees/${toValue(coffeeId)}/verdict`),
    enabled: import.meta.client,
  })
}

export function useCoffeeReviews(coffeeId: MaybeRefOrGetter<string>) {
  const request = useRequestFetch()

  return useQuery({
    queryKey: computed(() => queryKeys.coffeeReviews(toValue(coffeeId))),
    queryFn: () => request(`/api/coffees/${toValue(coffeeId)}/reviews`),
    enabled: import.meta.client,
  })
}

export function useCoffeeRoaster(coffeeId: MaybeRefOrGetter<string>) {
  const request = useRequestFetch()

  return useQuery({
    queryKey: computed(() => queryKeys.coffeeRoaster(toValue(coffeeId))),
    queryFn: () => request(`/api/coffees/${toValue(coffeeId)}/roaster`),
    enabled: import.meta.client,
  })
}

export function useCoffeeShelves(coffeeId: MaybeRefOrGetter<string>) {
  const request = useRequestFetch()

  return useQuery({
    queryKey: computed(() => queryKeys.coffeeShelves(toValue(coffeeId))),
    queryFn: () => request(`/api/coffees/${toValue(coffeeId)}/shelves`),
    enabled: import.meta.client,
  })
}

export function useCoffee(coffeeId: MaybeRefOrGetter<string>) {
  const request = useRequestFetch()

  return useQuery({
    queryKey: computed(() => queryKeys.coffee(toValue(coffeeId))),
    queryFn: () => request(`/api/coffees/${toValue(coffeeId)}`),
    meta: { ssr: true },
  })
}

function useCoffeeSaved() {
  const changed = useChanged()

  return (coffeeId: string) => changed({ type: 'coffee', coffeeId })
}

export function useCoffeeCreate() {
  const saved = useCoffeeSaved()

  return useMutation({
    mutationFn: (input: { shelfId: string; coffee: NewCoffee }) =>
      $fetch(`/api/shelves/${input.shelfId}/coffees`, {
        method: 'POST',
        body: input.coffee,
      }),
    onSuccess: added => saved(added.coffee.id),
  })
}

export function useCoffeeUpdate() {
  const saved = useCoffeeSaved()

  return useMutation({
    mutationFn: (input: { coffeeId: string; details: CoffeeDetails }) =>
      $fetch(`/api/coffees/${input.coffeeId}`, {
        method: 'PATCH',
        body: input.details,
      }),
    onSuccess: (_data, input) => saved(input.coffeeId),
  })
}

function photoPath(coffeeId: string) {
  return `/api/coffees/${coffeeId}/photo`
}

export function useCoffeePhotoUpdate() {
  const saved = useCoffeeSaved()

  return useMutation({
    mutationFn: async (input: { coffeeId: string; photo: Blob }) => {
      const body = new FormData()
      body.append('photo', await compressPhoto(input.photo))

      return $fetch(photoPath(input.coffeeId), { method: 'PUT', body })
    },
    onSuccess: (_data, input) => saved(input.coffeeId),
  })
}

export function useCoffeePhotoRemoval() {
  const saved = useCoffeeSaved()

  return useMutation({
    mutationFn: (coffeeId: string) =>
      $fetch(photoPath(coffeeId), { method: 'DELETE' }),
    onSuccess: (_data, coffeeId) => saved(coffeeId),
  })
}

export function useCoffeeDelete() {
  const saved = useCoffeeSaved()

  return useMutation({
    mutationFn: (coffeeId: string) =>
      $fetch(`/api/coffees/${coffeeId}`, { method: 'DELETE' }),
    onSuccess: (_data, coffeeId) => saved(coffeeId),
  })
}
