type Named = { id: string; name: string }

export function catalogCoffeePath(
  shelf: Named,
  coffee: Named & { onShelf: boolean },
) {
  return coffee.onShelf ? shelfCoffeePath(shelf, coffee) : coffeePath(coffee)
}
