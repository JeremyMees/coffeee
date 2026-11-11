<script setup lang="ts">
import { Field as VeeField } from 'vee-validate'
</script>

<template>
  <FieldGroup class="grid grid-cols-2 gap-4">
    <VeeField v-slot="{ componentField, errors }" name="purchasedOn">
      <Field :data-invalid="errors.length ? true : undefined">
        <FieldLabel for="purchased-on">
          Bought on
          <RequiredMark />
        </FieldLabel>
        <DatePicker
          id="purchased-on"
          v-bind="componentField"
          data-testid="coffee-purchased-on"
          label="Bought on"
          :invalid="errors.length > 0"
        />
        <FieldError :errors="errors" />
      </Field>
    </VeeField>
    <VeeField v-slot="{ componentField, errors }" name="roastedOn">
      <Field :data-invalid="errors.length ? true : undefined">
        <FieldLabel for="roasted-on">Roasted on</FieldLabel>
        <DatePicker
          id="roasted-on"
          v-bind="componentField"
          data-testid="coffee-roasted-on"
          label="Roasted on"
          clearable
          :invalid="errors.length > 0"
        />
        <FieldError :errors="errors" />
      </Field>
    </VeeField>
    <VeeField v-slot="{ componentField, errors }" name="sizeGrams">
      <Field :data-invalid="errors.length ? true : undefined">
        <FieldLabel for="size-grams">Size (g)</FieldLabel>
        <Input
          id="size-grams"
          v-bind="componentField"
          data-testid="coffee-size"
          type="number"
          inputmode="numeric"
          min="1"
          step="1"
          :aria-invalid="errors.length ? true : undefined"
        />
        <FieldError :errors="errors" />
      </Field>
    </VeeField>
    <VeeField v-slot="{ componentField, errors }" name="price">
      <Field :data-invalid="errors.length ? true : undefined">
        <FieldLabel for="price">Price (€)</FieldLabel>
        <Input
          id="price"
          v-bind="componentField"
          data-testid="coffee-price"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          :aria-invalid="errors.length ? true : undefined"
        />
        <FieldError :errors="errors" />
      </Field>
    </VeeField>
  </FieldGroup>
</template>
