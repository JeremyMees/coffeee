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
    <h1 class="text-[64px] lg:text-[88px]" data-testid="page-title">
      {{ title }}
    </h1>
    <button
      v-if="!hideAdd"
      type="button"
      :data-testid="addLabel ? 'page-add' : 'page-add-coffee'"
      :aria-keyshortcuts="addLabel ? undefined : 'N'"
      class="hidden items-center gap-2 rounded-full border border-primary px-6 py-2.5 text-sm uppercase transition-colors hover:bg-primary hover:text-primary-foreground lg:flex"
      @click="add"
    >
      <PlusIcon class="size-4" aria-hidden="true" />
      {{ addLabel ?? 'Add coffee' }}
    </button>
  </header>
</template>
