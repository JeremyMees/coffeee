<script setup lang="ts">
import { useCoffeeUpdate } from '~/queries/coffees'

const props = defineProps<{
  coffee: EditableCoffee & { photoUrl: string | null }
}>()

const open = defineModel<boolean>('open', { default: false })
const { mutateAsync: updateCoffee } = useCoffeeUpdate()

async function save(details: CoffeeDetails) {
  await updateCoffee({ coffeeId: props.coffee.id, details })

  return props.coffee.id
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
    :photo-url="coffee.photoUrl"
    :send="save"
  />
</template>
