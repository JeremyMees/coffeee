<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  title: string
  icon: Component
  tone?: 'info' | 'warning'
  testid?: string
}>()
</script>

<template>
  <Alert
    :variant="tone ?? 'info'"
    role="status"
    class="rounded-[14px] px-3.5 py-3"
    :data-testid="testid"
  >
    <component :is="icon" aria-hidden="true" />
    <AlertTitle class="font-sans font-semibold">{{ title }}</AlertTitle>
    <AlertDescription class="text-xs text-current">
      <slot />
    </AlertDescription>
    <div
      v-if="$slots.action"
      class="col-start-2 mt-2 flex flex-col items-start gap-3"
    >
      <slot name="action" />
    </div>
  </Alert>
</template>
