import { useMutation, useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'

function usePurchaseSaved() {
  const changed = useChanged()

  return (input: { shelfId: string; coffeeId: string }) =>
    changed({
      type: 'purchase',
      shelfId: input.shelfId,
      coffeeId: input.coffeeId,
    })
}

function coffeePath(input: { shelfId: string; coffeeId: string }) {
  return `/api/shelves/${input.shelfId}/coffees/${input.coffeeId}`
}

function purchasePath(input: {
  shelfId: string
  coffeeId: string
  purchaseId: string
}) {
  return `${coffeePath(input)}/purchases/${input.purchaseId}`
}

export function useShelfPurchases(
  shelfId: MaybeRefOrGetter<string>,
  coffeeId: MaybeRefOrGetter<string>,
) {
  const request = useRequestFetch()

  return useQuery({
    queryKey: computed(() =>
      queryKeys.shelfCoffeePurchases(toValue(shelfId), toValue(coffeeId)),
    ),
    queryFn: () =>
      request(
        `/api/shelves/${toValue(shelfId)}/coffees/${toValue(coffeeId)}/purchases`,
      ),
    enabled: import.meta.client,
  })
}

export function useBuyAgain() {
  const saved = usePurchaseSaved()

  return useMutation({
    mutationFn: (input: {
      shelfId: string
      coffeeId: string
      purchase: NewPurchase
    }) =>
      $fetch(`${coffeePath(input)}/purchases`, {
        method: 'POST',
        body: input.purchase,
      }),
    onSuccess: (_data, input) => saved(input),
  })
}

export function usePurchaseUpdate() {
  const saved = usePurchaseSaved()

  return useMutation({
    mutationFn: (input: {
      shelfId: string
      coffeeId: string
      purchaseId: string
      purchase: NewPurchase
    }) =>
      $fetch(purchasePath(input), { method: 'PATCH', body: input.purchase }),
    onSuccess: (_data, input) => saved(input),
  })
}

export function usePurchaseFinish() {
  const saved = usePurchaseSaved()

  return useMutation({
    mutationFn: (input: {
      shelfId: string
      coffeeId: string
      purchaseId: string
    }) => $fetch(`${purchasePath(input)}/finish`, { method: 'POST' }),
    onSuccess: (_data, input) => saved(input),
  })
}

export function usePurchaseRemoval() {
  const saved = usePurchaseSaved()

  return useMutation({
    mutationFn: (input: {
      shelfId: string
      coffeeId: string
      purchaseId: string
    }) => $fetch(purchasePath(input), { method: 'DELETE' }),
    onSuccess: (_data, input) => saved(input),
  })
}
