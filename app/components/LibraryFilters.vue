<script setup lang="ts">
import { HeartIcon, XIcon } from '@lucide/vue'

const filter = defineModel<LibraryFilter>({ required: true })

defineProps<{ shelfId: string }>()

const pickers = [
  { key: 'roaster', kind: 'roasters' },
  { key: 'flavorNote', kind: 'flavor-notes' },
  { key: 'origin', kind: 'origins' },
] as const

function change<Key extends keyof LibraryFilter>(
  key: Key,
  value: LibraryFilter[Key],
) {
  filter.value = { ...filter.value, [key]: value }
}
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-2"
    role="group"
    aria-label="Filters"
    data-testid="library-filters"
  >
    <button
      type="button"
      data-testid="library-filter-favourites"
      :aria-pressed="filter.favourites"
      :class="[
        'flex items-center gap-1.5 rounded-full border px-4 py-2 text-[12px] uppercase transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        filter.favourites
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-transparent bg-accent hover:border-primary',
      ]"
      @click="change('favourites', !filter.favourites)"
    >
      <HeartIcon
        :class="['size-3.5', filter.favourites && 'fill-current']"
        aria-hidden="true"
      />
      Favourites
    </button>
    <LibraryFilterPicker
      v-for="picker in pickers"
      :key="picker.key"
      :model-value="filter[picker.key]"
      :shelf-id="shelfId"
      :kind="picker.kind"
      @update:model-value="change(picker.key, $event)"
    />
    <button
      v-if="isLibraryFiltered(filter)"
      type="button"
      data-testid="library-filter-clear"
      class="flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] uppercase underline-offset-4 hover:underline"
      @click="filter = emptyLibraryFilter()"
    >
      <XIcon class="size-3.5" aria-hidden="true" />
      Clear
    </button>
  </div>
</template>
