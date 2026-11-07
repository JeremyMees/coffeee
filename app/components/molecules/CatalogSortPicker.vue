<script setup lang="ts">
const sort = defineModel<CatalogSort>({ required: true })
</script>

<template>
  <div
    class="flex rounded-full bg-accent p-1"
    role="group"
    aria-label="Sort by"
    data-testid="catalog-sort"
  >
    <button
      v-for="option in catalogSorts"
      :key="option"
      type="button"
      :data-testid="`catalog-sort-${option}`"
      :aria-pressed="sort === option"
      :class="[
        'rounded-full px-3 py-1.5 text-[12px] uppercase transition-colors',
        sort === option
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-background',
      ]"
      @click="sort = option"
    >
      {{ catalogSortLabels[option] }}
    </button>
  </div>
</template>
