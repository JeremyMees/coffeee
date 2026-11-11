<script setup lang="ts">
defineProps<{ label: string; centered?: boolean }>()
</script>

<template>
  <div
    :class="['flex gap-1.5', centered ? 'items-center' : 'items-baseline']"
    data-testid="spec-row"
  >
    <dt>{{ label }}</dt>
    <span
      :class="[
        'min-w-3 flex-1 border-b border-dotted border-primary',
        !centered && '-translate-y-[3px]',
      ]"
      aria-hidden="true"
      data-testid="spec-row-leader"
    />
    <slot />
  </div>
</template>
