<script setup lang="ts">
import { useFieldValue, useSetFieldValue } from 'vee-validate'

const originListPickers: Record<OriginListField, ListPickerConfig> = {
  regions: {
    label: 'Region',
    endpoint: '/api/regions',
    noun: 'region',
    id: 'coffee-regions',
  },
  farms: {
    label: 'Farm',
    endpoint: '/api/farms',
    noun: 'farm',
    id: 'coffee-farms',
  },
  washingStations: {
    label: 'Washing station',
    endpoint: '/api/washing-stations',
    noun: 'washing station',
    id: 'coffee-washing-stations',
  },
}

const pickedOrigins = useFieldValue<string[]>('origins')
const originListValues = originListFields.map(field => ({
  picked: useFieldValue<OriginEntry[]>(field),
  set: useSetFieldValue<OriginEntry[]>(field),
}))

watch(pickedOrigins, codes => {
  for (const { picked, set } of originListValues) {
    const entries = picked.value ?? []
    const kept = entries.filter(entry => codes.includes(entry.origin))

    if (kept.length !== entries.length) set(kept)
  }
})
</script>

<template>
  <LabelledField
    v-slot="{ value, handleChange, handleBlur, invalid }"
    name="origins"
    label="Origin"
    required
    input-id="coffee-origins"
  >
    <OriginPicker
      id="coffee-origins"
      :model-value="value"
      data-testid="coffee-origins"
      :invalid="invalid"
      @update:model-value="handleChange"
      @blur="handleBlur"
    />
  </LabelledField>

  <LabelledField
    v-for="field in originListFields"
    :key="field"
    v-slot="{ value, handleChange, handleBlur, invalid }"
    :name="field"
    :label="originListPickers[field].label"
    :input-id="originListPickers[field].id"
  >
    <ScopedListPicker
      :id="originListPickers[field].id"
      :model-value="value"
      :endpoint="originListPickers[field].endpoint"
      :origins="pickedOrigins ?? []"
      :placeholder="`Search or add a ${originListPickers[field].noun}`"
      :hint="`Type the ${originListPickers[field].noun}'s name`"
      :data-testid="originListPickers[field].id"
      :invalid="invalid"
      @update:model-value="handleChange"
      @blur="handleBlur"
    />
  </LabelledField>

  <AltitudeFields />
</template>
