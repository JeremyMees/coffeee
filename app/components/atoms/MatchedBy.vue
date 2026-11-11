<script setup lang="ts">
const props = defineProps<{ matches: CatalogMatch[]; testid: string }>()

const labels = computed(() => matchLabels(props))
</script>

<template>
  <ul
    v-if="labels.length"
    class="flex flex-wrap gap-1.5"
    aria-label="Matched"
    :data-testid="`${testid}-matches`"
  >
    <li
      v-for="label in labels"
      :key="label"
      class="rounded-full bg-accent px-2.5 py-1 text-xs uppercase"
      :data-testid="`${testid}-match`"
    >
      {{ label }}
    </li>
  </ul>
</template>
