<script setup lang="ts">
import { StoreIcon } from '@lucide/vue'

const filter = defineModel<RoasterFilter>({ required: true })

defineProps<{ shelfId: string }>()

function change(changes: Partial<RoasterFilter>) {
  filter.value = { ...filter.value, ...changes }
}

const applied = computed(() =>
  filter.value.country.map(option => ({
    key: option.value,
    label: `Country: ${option.label}`,
  })),
)

const count = computed(
  () => applied.value.length + Number(filter.value.boughtFrom),
)

function remove(value: string) {
  change({
    country: filter.value.country.filter(option => option.value !== value),
  })
}
</script>

<template>
  <FilterBar :count="count" testid="roasters">
    <FilterToggle
      :model-value="filter.boughtFrom"
      label="Bought from"
      :icon="StoreIcon"
      data-testid="roasters-filter-bought-from"
      @update:model-value="change({ boughtFrom: $event })"
    />
    <FilterPicker
      :model-value="filter.country"
      :shelf-id="shelfId"
      area="roasters"
      kind="countries"
      label="Country"
      @update:model-value="change({ country: $event })"
    />

    <template #applied>
      <LazyAppliedFilters
        v-if="isRoasterFiltered(filter)"
        :items="applied"
        testid="roasters"
        @remove="remove($event.key)"
        @clear="change(emptyRoasterFilter())"
      />
    </template>
  </FilterBar>
</template>
