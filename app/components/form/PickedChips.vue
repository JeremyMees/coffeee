<script setup lang="ts">
import { XIcon } from '@lucide/vue'

defineProps<{ chips: { key: string; label: string; detail?: string }[] }>()

defineEmits<{ remove: [key: string] }>()
</script>

<template>
  <ul v-if="chips.length" class="flex flex-wrap gap-2">
    <li
      v-for="chip in chips"
      :key="chip.key"
      data-testid="chip"
      class="flex items-center gap-1.5 rounded-full bg-accent py-1 pr-1 pl-3 text-[12px] uppercase"
    >
      <span data-testid="chip-label">{{ chip.label }}</span>
      <span
        v-if="chip.detail"
        data-testid="chip-detail"
        class="text-muted-foreground"
      >
        · {{ chip.detail }}
      </span>
      <button
        type="button"
        data-testid="chip-remove"
        class="rounded-full p-1 transition-colors hover:bg-primary hover:text-primary-foreground"
        :aria-label="`Remove ${chip.label}`"
        @click="$emit('remove', chip.key)"
      >
        <XIcon class="size-3" aria-hidden="true" />
      </button>
    </li>
  </ul>
</template>
