<script setup lang="ts">
const props = withDefaults(defineProps<{ fields?: CoffeeListField[] }>(), {
  fields: () => ['processes', 'varietals', 'flavorNotes', 'producers'],
})

const listPickers: Record<CoffeeListField, ListPickerConfig> = {
  processes: {
    label: 'Process',
    endpoint: '/api/processes',
    noun: 'process',
    id: 'coffee-processes',
  },
  varietals: {
    label: 'Varietal',
    endpoint: '/api/varietals',
    noun: 'varietal',
    id: 'coffee-varietals',
  },
  flavorNotes: {
    label: 'Flavor note',
    endpoint: '/api/flavor-notes',
    noun: 'flavor note',
    id: 'coffee-flavor-notes',
  },
  producers: {
    label: 'Producer',
    endpoint: '/api/producers',
    noun: 'producer',
    id: 'coffee-producers',
  },
}

const shown = computed(() =>
  props.fields.map(field => ({ field, picker: listPickers[field] })),
)
</script>

<template>
  <LabelledField
    v-for="{ field, picker } in shown"
    :key="field"
    v-slot="{ value, handleChange, handleBlur, invalid }"
    :name="field"
    :label="picker.label"
    :required="field === 'processes'"
    :input-id="picker.id"
  >
    <MultiListPicker
      :id="picker.id"
      :model-value="value"
      :endpoint="picker.endpoint"
      :placeholder="`Search or add a ${picker.noun}`"
      :hint="`Type the ${picker.noun}'s name`"
      :data-testid="picker.id"
      :invalid="invalid"
      @update:model-value="handleChange"
      @blur="handleBlur"
    />
  </LabelledField>
</template>
