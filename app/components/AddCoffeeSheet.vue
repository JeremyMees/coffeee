<script setup lang="ts">
import { useCoffeeCreate } from '~/queries/coffees'

const open = useAddCoffee()
const shelf = useCurrentShelf()
const { mutateAsync: createCoffee } = useCoffeeCreate()

async function add(coffee: NewCoffee) {
  if (!shelf.value) {
    throw createError({ statusMessage: 'Join a shelf before adding a coffee' })
  }

  await createCoffee({ shelfId: shelf.value.id, coffee })
}

function stock() {
  return shelf.value && shelfPath(shelf.value)
}
</script>

<template>
  <CoffeeFormSheet
    v-model:open="open"
    prefix="add-coffee"
    title="Add coffee"
    description="A coffee you just bought, with its first bag."
    submit-label="Add coffee"
    first-bag
    :send="add"
    :go-to="stock"
  />
</template>
