<script setup lang="ts">
import type { Component } from 'vue'

const on = defineModel<boolean>({ required: true })

defineProps<{ label: string; icon: Component; solid?: boolean }>()
</script>

<template>
  <button
    type="button"
    :aria-pressed="on"
    :class="[
      'flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-3 lg:min-h-0 lg:py-2 text-[12px] uppercase transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
      on
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-transparent bg-accent hover:border-primary',
    ]"
    @click="on = !on"
  >
    <component
      :is="icon"
      :class="['size-3.5', on && solid && 'fill-current']"
      aria-hidden="true"
    />
    {{ label }}
  </button>
</template>
