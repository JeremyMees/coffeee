<script setup lang="ts">
import { ArrowUpDownIcon } from '@lucide/vue'

const sort = defineModel<LibrarySort | null>({ required: true })

const props = defineProps<{ scope: LibraryScope }>()

const fallback = computed(() => defaultSortFor(props.scope))
const picked = computed(() => sort.value?.column ?? fallback.value)

function pick(column: LibrarySortBy) {
  sort.value =
    column === fallback.value
      ? null
      : { column, direction: librarySortDirections[column] }
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button
        type="button"
        data-testid="library-sort"
        class="flex items-center gap-2 rounded-full border border-primary px-4 py-3 text-[12px] uppercase hover:bg-accent lg:py-2"
      >
        <ArrowUpDownIcon class="size-3.5" aria-hidden="true" />
        <span class="sr-only">Sort by </span>
        {{ librarySortLabels[picked] }}
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="end"
      data-testid="library-sort-menu"
      class="min-w-52 rounded-[18px] p-1.5 font-mono ring-primary"
    >
      <DropdownMenuLabel class="text-xs uppercase">Sort by</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        :model-value="picked"
        @update:model-value="pick($event as LibrarySortBy)"
      >
        <DropdownMenuRadioItem
          v-for="column in sortsFor(scope)"
          :key="column"
          :value="column"
          class="rounded-full px-3 py-2"
          :data-testid="`library-sort-option-${column}`"
        >
          {{ librarySortLabels[column] }}
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
