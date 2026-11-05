<script setup lang="ts">
import { useCoffeeUpdate } from '~/queries/coffees'

const props = defineProps<{ shelfId: string; coffee: EditableCoffee }>()

const open = defineModel<boolean>('open', { default: false })
const { mutateAsync: updateCoffee } = useCoffeeUpdate()

async function save(details: CoffeeDetails) {
  await updateCoffee({
    shelfId: props.shelfId,
    coffeeId: props.coffee.id,
    details,
  })
}
</script>

<template>
  <CoffeeFormSheet
    v-model:open="open"
    prefix="edit-coffee"
    title="Edit coffee"
    description="Fix its details for everyone who has it on a shelf."
    submit-label="Save changes"
    :coffee="coffee"
    :send="save"
  />
</template>
