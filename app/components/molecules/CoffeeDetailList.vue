<script setup lang="ts">
const props = defineProps<{ coffee: EditableCoffee }>()

function names(entries: ListEntry[]) {
  return entries.map(entry => entry.name).join(', ')
}

const rows = computed(() => {
  const shown = props.coffee
  const inOrigins = (entries: OriginEntry[]) =>
    entries
      .map(entry =>
        shown.origins.length > 1
          ? `${entry.name} (${originName(entry.origin)})`
          : entry.name,
      )
      .join(', ')

  return [
    {
      key: 'roast',
      label: 'Roast',
      value: `${roastLevelLabels[shown.roastLevel]} · ${roastedForLabels[shown.roastedFor]}`,
    },
    {
      key: 'flavor-notes',
      label: 'Flavor notes',
      value: names(shown.flavorNotes),
    },
    {
      key: 'origins',
      label: 'Origin',
      value: shown.origins.map(origin => origin.name).join(', '),
    },
    { key: 'regions', label: 'Region', value: inOrigins(shown.regions) },
    {
      key: 'altitude',
      label: 'Altitude',
      value: formatAltitude(shown.altitudeFrom, shown.altitudeTo) ?? '',
    },
    { key: 'producers', label: 'Producer', value: names(shown.producers) },
    { key: 'farms', label: 'Farm', value: inOrigins(shown.farms) },
    {
      key: 'washing-stations',
      label: 'Washing station',
      value: inOrigins(shown.washingStations),
    },
    { key: 'processes', label: 'Process', value: names(shown.processes) },
    { key: 'varietals', label: 'Varietal', value: names(shown.varietals) },
  ].filter(row => row.value)
})
</script>

<template>
  <dl
    class="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-xs"
    data-testid="coffee-details"
  >
    <template v-for="row in rows" :key="row.key">
      <dt class="uppercase">{{ row.label }}</dt>
      <dd :data-testid="`detail-${row.key}`">{{ row.value }}</dd>
    </template>
  </dl>
</template>
