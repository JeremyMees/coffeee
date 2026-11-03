<script setup lang="ts">
import { Field as VeeField } from 'vee-validate'

defineProps<{
  name: string
  label: string
  inputId: string
  small?: boolean
  required?: boolean
}>()
</script>

<template>
  <VeeField v-slot="field" :name="name">
    <Field :data-invalid="field.errors.length ? true : undefined">
      <FieldLabel :for="inputId" :class="small ? 'text-xs' : undefined">
        {{ label }}
        <RequiredMark v-if="required" />
      </FieldLabel>
      <slot v-bind="field" :invalid="field.errors.length > 0" />
      <FieldError :errors="field.errors" />
    </Field>
  </VeeField>
</template>
