<script setup lang="ts">
import { Field as VeeField } from 'vee-validate'

defineProps<{ name: string; legend: string; required?: boolean }>()
</script>

<template>
  <VeeField v-slot="field" :name="name">
    <FieldSet :data-invalid="field.errors.length ? true : undefined">
      <FieldLegend variant="label">
        {{ legend }}
        <RequiredMark v-if="required" />
      </FieldLegend>
      <slot v-bind="field" :invalid="field.errors.length > 0" />
      <FieldError :errors="field.errors" />
    </FieldSet>
  </VeeField>
</template>
