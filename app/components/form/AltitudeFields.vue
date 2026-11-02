<script setup lang="ts">
const ends = [
  { name: 'altitudeFrom', label: 'From (m)', id: 'coffee-altitude-from' },
  { name: 'altitudeTo', label: 'To (m)', id: 'coffee-altitude-to' },
]
</script>

<template>
  <FieldSet>
    <FieldLegend variant="label">Altitude</FieldLegend>
    <div class="grid grid-cols-2 gap-3">
      <LabelledField
        v-for="end in ends"
        :key="end.name"
        v-slot="{ componentField, invalid }"
        :name="end.name"
        :label="end.label"
        :input-id="end.id"
        small
      >
        <Input
          :id="end.id"
          v-bind="componentField"
          :data-testid="end.id"
          inputmode="numeric"
          autocomplete="off"
          :aria-invalid="invalid || undefined"
        />
      </LabelledField>
    </div>
  </FieldSet>
</template>
