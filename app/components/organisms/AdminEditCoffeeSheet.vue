<script setup lang="ts">
import { useCoffee } from '~/queries/coffees'

const props = defineProps<{ coffeeId: string }>()

const open = defineModel<boolean>('open', { default: false })
const { data: coffee } = useCoffee(() => props.coffeeId)
</script>

<template>
  <EditCoffeeSheet v-if="coffee" v-model:open="open" :coffee="coffee" />
</template>
