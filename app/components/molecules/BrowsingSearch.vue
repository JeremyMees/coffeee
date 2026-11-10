<script setup lang="ts">
import { SearchIcon } from '@lucide/vue'
import { useMediaQuery } from '@vueuse/core'

const search = defineModel<string>({ required: true })

const props = defineProps<{
  label: string
  placeholder: string
  shortPlaceholder?: string
  shortcut?: boolean
}>()

const wide = useMediaQuery('(min-width: 768px)')
const shown = computed(() =>
  wide.value
    ? props.placeholder
    : (props.shortPlaceholder ?? props.placeholder),
)

const input = useTemplateRef<HTMLInputElement>('input')

defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <label
    class="flex max-w-2xl items-center gap-3 rounded-full border border-primary px-5 py-3 focus-within:ring-2 focus-within:ring-ring"
  >
    <SearchIcon class="size-4 shrink-0" aria-hidden="true" />
    <span class="sr-only">{{ label }}</span>
    <input
      ref="input"
      v-model="search"
      type="search"
      autocomplete="off"
      :placeholder="shown"
      class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      data-testid="search-input"
    />
    <kbd
      v-if="shortcut"
      class="hidden shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] lg:inline"
      aria-hidden="true"
    >
      ⌘K
    </kbd>
  </label>
</template>
