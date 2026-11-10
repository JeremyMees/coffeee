<script setup lang="ts" generic="Filter extends BrowsingFilter">
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
      key: `${picker.key}-${option.value}`,
      picker,
      option,
      label: `${browsingFilterLabels[picker.kind]}: ${option.label}`,
    })),
  ),
)

const count = computed(() => applied.value.length + Number(toggled.value))

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
  <FilterBar :count="count" :testid="area">
    <LazyFilterToggle
      v-if="toggle"
      :model-value="toggled"
      :label="toggle.label"
      :icon="toggle.icon"
      solid
      :data-testid="`${area}-filter-${toggle.key}`"
      @update:model-value="change({ [toggle.key]: $event } as Partial<Filter>)"
    />
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

    <template #applied>
      <LazyAppliedFilters
        v-if="filtered"
        :items="applied"
        :testid="area"
        @remove="remove($event.picker, $event.option.value)"
        @clear="clear"
      />
    </template>
  </FilterBar>
</template>
