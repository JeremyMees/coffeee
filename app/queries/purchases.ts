import { useMutation, useQueryClient } from '@tanstack/vue-query'

function usePurchaseSaved() {
  const queryClient = useQueryClient()

  return (input: { shelfId: string }) =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.shelf(input.shelfId),
      }),
      queryClient.invalidateQueries({ queryKey: queryKeys.coffees() }),
    ])
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

export function useCoffeeFinish() {
  const saved = usePurchaseSaved()

  return useMutation({
    mutationFn: (input: { shelfId: string; coffeeId: string }) =>
      $fetch(`${coffeePath(input)}/finish`, { method: 'POST' }),
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
