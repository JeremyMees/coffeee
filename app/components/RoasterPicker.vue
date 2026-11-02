<script setup lang="ts">
const model = defineModel<string>({ default: '' })

defineProps<{ id: string; invalid?: boolean }>()

const { data: roasters } = useFetch('/api/roasters', {
  key: 'roasters',
  default: () => [],
})

const search = ref(model.value)
const key = computed(() => nameKey(search.value))
const matches = computed(() =>
  roasters.value.filter(roaster => nameKey(roaster.name).includes(key.value)),
)
const canCreate = computed(
  () =>
    key.value !== '' &&
    !roasters.value.some(roaster => nameKey(roaster.name) === key.value),
)
</script>

<template>
  <Combobox v-model="model" ignore-filter open-on-focus>
    <ComboboxAnchor>
      <ComboboxInput
        :id="id"
        v-model="search"
        placeholder="Search or add a roaster"
        autocomplete="off"
        :aria-invalid="invalid ? true : undefined"
      />
    </ComboboxAnchor>
    <ComboboxList class="rounded-[18px] p-1.5 font-mono ring-primary">
      <ComboboxViewport>
        <ComboboxItem
          v-for="roaster in matches"
          :key="roaster.id"
          :value="roaster.name"
          class="rounded-full px-3 py-2"
        >
          {{ roaster.name }}
        </ComboboxItem>
        <ComboboxItem
          v-if="canCreate"
          :value="search.trim()"
          class="rounded-full px-3 py-2"
        >
          Add “{{ search.trim() }}”
        </ComboboxItem>
        <p v-if="!matches.length && !canCreate" class="px-3 py-2 text-xs">
          Type the roaster's name
        </p>
      </ComboboxViewport>
    </ComboboxList>
  </Combobox>
</template>
