<script setup lang="ts">
import { BookmarkIcon, XIcon } from '@lucide/vue'

const filter = defineModel<CatalogFilter>({ required: true })

defineProps<{ shelfId: string }>()

function change<Key extends keyof CatalogFilter>(
  key: Key,
  value: CatalogFilter[Key],
) {
  filter.value = { ...filter.value, [key]: value }
}
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-2"
    role="group"
    aria-label="Filters"
    data-testid="catalog-filters"
  >
    <button
      type="button"
      data-testid="catalog-filter-mine"
      :aria-pressed="filter.mine"
      :class="[
        'flex items-center gap-1.5 rounded-full border px-4 py-2 text-[12px] uppercase transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        filter.mine
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-transparent bg-accent hover:border-primary',
      ]"
      @click="change('mine', !filter.mine)"
    >
      <BookmarkIcon
        :class="['size-3.5', filter.mine && 'fill-current']"
        aria-hidden="true"
      />
      Mine
    </button>
    <FilterPicker
      v-for="picker in catalogPickers"
      :key="picker.key"
      :model-value="filter[picker.key]"
      :shelf-id="shelfId"
      area="catalog"
      :kind="picker.kind"
      :label="catalogFilterLabels[picker.kind]"
      @update:model-value="change(picker.key, $event)"
    />
    <button
      v-if="isCatalogFiltered(filter)"
      type="button"
      data-testid="catalog-filter-clear"
      class="flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] uppercase underline-offset-4 hover:underline"
      @click="filter = emptyCatalogFilter()"
    >
      <XIcon class="size-3.5" aria-hidden="true" />
      Clear
    </button>
  </div>
</template>
