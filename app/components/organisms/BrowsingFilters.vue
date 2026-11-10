<script setup lang="ts" generic="Filter extends BrowsingFilter">
import { XIcon } from '@lucide/vue'
import type { Component } from 'vue'

const filter = defineModel<Filter>({ required: true })

const props = defineProps<{
  shelfId: string
  area: FilterArea
  toggle?: { key: keyof Filter & string; label: string; icon: Component }
}>()

const toggled = computed(() =>
  Boolean(props.toggle && filter.value[props.toggle.key]),
)
const filtered = computed(
  () => toggled.value || isBrowsingFiltered(filter.value),
)

function change(changes: Partial<Filter>) {
  filter.value = { ...filter.value, ...changes }
}

const applied = computed(() =>
  browsingPickers.flatMap(picker =>
    filter.value[picker.key].map(option => ({
      picker,
      option,
      label: `${browsingFilterLabels[picker.kind]}: ${option.label}`,
    })),
  ),
)

function remove(picker: BrowsingPicker, value: string) {
  change({
    [picker.key]: filter.value[picker.key].filter(
      option => option.value !== value,
    ),
  } as Partial<Filter>)
}

function clear() {
  change({
    ...emptyBrowsingFilter(),
    ...(props.toggle && { [props.toggle.key]: false }),
  } as Partial<Filter>)
}
</script>

<template>
  <div>
    <div
      class="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Filters"
      :data-testid="`${area}-filters`"
    >
      <button
        v-if="toggle"
        type="button"
        :data-testid="`${area}-filter-${toggle.key}`"
        :aria-pressed="toggled"
        :class="[
          'flex items-center gap-1.5 rounded-full border px-4 py-3 lg:py-2 text-[12px] uppercase transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
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
        @update:model-value="
          change({ [picker.key]: $event } as Partial<Filter>)
        "
      />
    </div>
    <ul
      v-if="filtered"
      class="mt-3 flex flex-wrap items-center gap-2"
      aria-label="Picked filters"
      :data-testid="`${area}-applied`"
    >
      <li
        v-for="item in applied"
        :key="`${item.picker.key}-${item.option.value}`"
      >
        <button
          type="button"
          :data-testid="`${area}-applied-filter`"
          :aria-label="`Remove ${item.label}`"
          class="flex max-w-64 items-center gap-1.5 rounded-full border border-primary px-3 py-[13px] text-[11px] uppercase transition-colors hover:bg-accent lg:py-1.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          @click="remove(item.picker, item.option.value)"
        >
          <span class="truncate">{{ item.label }}</span>
          <XIcon class="size-3 shrink-0" aria-hidden="true" />
        </button>
      </li>
      <li>
        <button
          type="button"
          :data-testid="`${area}-filter-clear`"
          class="hit-area rounded-full px-3 py-1.5 text-[11px] uppercase underline-offset-4 hover:underline"
          @click="clear"
        >
          Clear all
        </button>
      </li>
    </ul>
  </div>
</template>
