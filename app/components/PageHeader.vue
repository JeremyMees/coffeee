<script setup lang="ts">
import { PlusIcon } from '@lucide/vue'

defineProps<{ title: string }>()

const addCoffee = useAddCoffee()
</script>

<template>
  <header class="flex items-end justify-between gap-4 pt-6 lg:pt-10">
    <h1 class="text-[64px] lg:text-[88px]" data-testid="page-title">
      {{ title }}
    </h1>
    <button
      type="button"
      data-testid="page-add-coffee"
      class="hidden items-center gap-2 rounded-full border border-primary px-6 py-2.5 text-sm uppercase transition-colors hover:bg-primary hover:text-primary-foreground lg:flex"
      @click="addCoffee = true"
    >
      <PlusIcon class="size-4" aria-hidden="true" />
      Add coffee
    </button>
  </header>
</template>
