<script setup lang="ts">
defineProps<{ href: string }>()
</script>

<template>
  <Button
    :href="href"
    class="rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground uppercase"
  >
    <slot />
  </Button>
</template>
