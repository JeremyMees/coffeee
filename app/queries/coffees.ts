import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
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
    enabled: import.meta.client,
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

function previewRows(data: unknown): CoffeePreview[] {
  if (Array.isArray(data)) return data
  const found = (data ?? {}) as {
    pages?: { coffees: CoffeePreview[] }[]
    coffees?: CoffeePreview[]
  }

  return found.pages?.flatMap(page => page.coffees) ?? found.coffees ?? []
}

export function useCoffeePreview(
  shelfId: MaybeRefOrGetter<string>,
  coffeeId: MaybeRefOrGetter<string>,
) {
  const queryClient = useQueryClient()

  return computed(() => {
    const shelf = queryKeys.shelf(toValue(shelfId))
    const lists = [
      queryKeys.stock(toValue(shelfId)),
      [...shelf, 'library'],
      [...shelf, 'catalog'],
    ]

    for (const queryKey of lists) {
      for (const [, data] of queryClient.getQueriesData({ queryKey })) {
        const found = previewRows(data).find(
          coffee => coffee.id === toValue(coffeeId),
        )

        if (found) {
          const { id, name, roaster, photoUrl } = found

          return { id, name, roaster, photoUrl }
        }
      }
    }

    return undefined
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
