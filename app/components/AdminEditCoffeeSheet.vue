<script setup lang="ts">
import { useCoffee } from '~/queries/coffees'

const props = defineProps<{ coffeeId: string }>()

const open = defineModel<boolean>('open', { default: false })
const shelf = useCurrentShelf()
const { data: coffee } = useCoffee(() => props.coffeeId)
</script>

<template>
  <EditCoffeeSheet
    v-if="coffee && shelf"
    v-model:open="open"
    :shelf-id="shelf.id"
    :coffee="coffee"
  />
</template>
