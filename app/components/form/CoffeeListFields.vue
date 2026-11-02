<script setup lang="ts">
const listPickers: Record<
  CoffeeListField,
  { label: string; endpoint: string; noun: string; id: string }
> = {
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
  producers: {
    label: 'Producer',
    endpoint: '/api/producers',
    noun: 'producer',
    id: 'coffee-producers',
  },
}
</script>

<template>
  <LabelledField
    v-for="(picker, field) in listPickers"
    :key="field"
    v-slot="{ value, handleChange, handleBlur, invalid }"
    :name="field"
    :label="picker.label"
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
