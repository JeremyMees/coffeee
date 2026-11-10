<script setup lang="ts" generic="Item extends { key: string; label: string }">
import { XIcon } from '@lucide/vue'

defineProps<{ items: Item[]; testid: string }>()

const emit = defineEmits<{ remove: [item: Item]; clear: [] }>()
</script>

<template>
  <ul
    class="flex flex-wrap items-center gap-2"
    aria-label="Picked filters"
    :data-testid="`${testid}-applied`"
  >
    <li v-for="item in items" :key="item.key">
      <button
        type="button"
        :data-testid="`${testid}-applied-filter`"
        :aria-label="`Remove ${item.label}`"
        class="flex max-w-64 items-center gap-1.5 rounded-full border border-primary px-3 py-[13px] text-[11px] uppercase transition-colors hover:bg-accent lg:py-1.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        @click="emit('remove', item)"
      >
        <span class="truncate">{{ item.label }}</span>
        <XIcon class="size-3 shrink-0" aria-hidden="true" />
      </button>
    </li>
    <li>
      <button
        type="button"
        :data-testid="`${testid}-filter-clear`"
        class="hit-area rounded-full px-3 py-1.5 text-[11px] uppercase underline-offset-4 hover:underline"
        @click="emit('clear')"
      >
        Clear all
      </button>
    </li>
  </ul>
</template>
