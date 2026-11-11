<script setup lang="ts">
import { PlusIcon } from '@lucide/vue'

const props = defineProps<{
  title: string
  addLabel?: string
  hideAdd?: boolean
}>()

const emit = defineEmits<{ add: [] }>()

const addCoffee = useAddCoffee()

function add() {
  if (props.addLabel) emit('add')
  else addCoffee.value = true
}
</script>

<template>
  <header class="flex items-end justify-between gap-4 pt-6">
    <h1 class="text-title" data-testid="page-title">
      {{ title }}
    </h1>
    <Button
      v-if="!hideAdd"
      type="button"
      :data-testid="addLabel ? 'page-add' : 'page-add-coffee'"
      :aria-keyshortcuts="addLabel ? undefined : 'N'"
      variant="outline"
      size="lg"
      class="hidden lg:inline-flex"
      @click="add"
    >
      <PlusIcon class="size-4" aria-hidden="true" />
      {{ addLabel ?? 'Add coffee' }}
    </Button>
  </header>
</template>
