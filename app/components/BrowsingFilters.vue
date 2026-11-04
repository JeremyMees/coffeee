<script setup lang="ts" generic="Filter extends BrowsingFilter">
import { XIcon } from '@lucide/vue'
import type { Component } from 'vue'

const filter = defineModel<Filter>({ required: true })

const props = defineProps<{
  shelfId: string
  area: FilterArea
  toggle: { key: keyof Filter & string; label: string; icon: Component }
}>()

const toggled = computed(() => Boolean(filter.value[props.toggle.key]))
const filtered = computed(
  () => toggled.value || isBrowsingFiltered(filter.value),
)

function change(changes: Partial<Filter>) {
  filter.value = { ...filter.value, ...changes }
}

function clear() {
  change({
    ...emptyBrowsingFilter(),
    [props.toggle.key]: false,
  } as Partial<Filter>)
}
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-2"
    role="group"
    aria-label="Filters"
    :data-testid="`${area}-filters`"
  >
    <button
      type="button"
      :data-testid="`${area}-filter-${toggle.key}`"
      :aria-pressed="toggled"
      :class="[
        'flex items-center gap-1.5 rounded-full border px-4 py-2 text-[12px] uppercase transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        toggled
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-transparent bg-accent hover:border-primary',
      ]"
      @click="change({ [toggle.key]: !toggled } as Partial<Filter>)"
    >
      <component
        :is="toggle.icon"
        :class="['size-3.5', toggled && 'fill-current']"
        aria-hidden="true"
      />
      {{ toggle.label }}
    </button>
    <FilterPicker
      v-for="picker in browsingPickers"
      :key="picker.key"
      :model-value="filter[picker.key]"
      :shelf-id="shelfId"
      :area="area"
      :kind="picker.kind"
      :label="browsingFilterLabels[picker.kind]"
      @update:model-value="change({ [picker.key]: $event } as Partial<Filter>)"
    />
    <button
      v-if="filtered"
      type="button"
      :data-testid="`${area}-filter-clear`"
      class="flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] uppercase underline-offset-4 hover:underline"
      @click="clear"
    >
      <XIcon class="size-3.5" aria-hidden="true" />
      Clear
    </button>
  </div>
</template>
