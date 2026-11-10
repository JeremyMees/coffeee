<script setup lang="ts">
import { SlidersHorizontalIcon } from '@lucide/vue'

const props = defineProps<{ count: number; testid: string }>()

const open = ref(false)

const label = computed(() =>
  props.count ? `Filters, ${props.count} picked` : 'Filters',
)
</script>

<template>
  <div :data-testid="`${testid}-filter-bar`">
    <button
      type="button"
      :data-testid="`${testid}-filters-open`"
      :aria-label="label"
      aria-haspopup="dialog"
      :aria-expanded="open"
      :class="[
        'flex items-center gap-1.5 rounded-full border px-4 py-3 text-[12px] uppercase transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:hidden',
        count
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-transparent bg-accent hover:border-primary',
      ]"
      @click="open = true"
    >
      <SlidersHorizontalIcon class="size-3.5" aria-hidden="true" />
      Filters
      <span
        v-if="count"
        class="grid min-w-4 place-items-center rounded-full bg-primary-foreground px-1 text-[10px] leading-4 text-primary tabular-nums"
        :data-testid="`${testid}-filters-count`"
        aria-hidden="true"
      >
        {{ count }}
      </span>
    </button>
    <div v-if="!open" class="hidden lg:block">
      <div
        class="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Filters"
        :data-testid="`${testid}-filters`"
      >
        <slot />
      </div>
      <div class="*:mt-3">
        <slot name="applied" />
      </div>
    </div>
    <FormSheet
      v-model:open="open"
      title="Filters"
      description="Pick as many as you like."
      :data-testid="`${testid}-filters-sheet`"
    >
      <div
        class="flex flex-col gap-6 px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:px-8 lg:pb-8"
      >
        <div
          class="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filters"
          :data-testid="`${testid}-filters`"
        >
          <slot />
        </div>
        <slot name="applied" />
        <Button
          type="button"
          size="lg"
          class="w-full"
          :data-testid="`${testid}-filters-done`"
          @click="open = false"
        >
          Done
        </Button>
      </div>
    </FormSheet>
  </div>
</template>
