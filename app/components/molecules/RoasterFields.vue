<script setup lang="ts">
const countries = [...originCodes].sort((a, b) =>
  origins[a].localeCompare(origins[b]),
)
</script>

<template>
  <FieldGroup>
    <LabelledField
      v-slot="{ componentField, invalid }"
      name="name"
      label="Name"
      input-id="roaster-name"
    >
      <Input
        id="roaster-name"
        v-bind="componentField"
        data-testid="roaster-name"
        autocomplete="off"
        :aria-invalid="invalid || undefined"
      />
    </LabelledField>
    <LabelledField
      v-slot="{ componentField, invalid }"
      name="website"
      label="Website"
      input-id="roaster-website"
    >
      <Input
        id="roaster-website"
        v-bind="componentField"
        data-testid="roaster-website"
        type="url"
        inputmode="url"
        autocomplete="off"
        :aria-invalid="invalid || undefined"
      />
    </LabelledField>
    <LabelledField
      v-slot="{ value, handleChange, handleBlur, invalid }"
      name="countryCode"
      label="Country"
      input-id="roaster-country"
    >
      <NativeSelect
        id="roaster-country"
        :model-value="value"
        name="countryCode"
        class="w-full"
        data-testid="roaster-country"
        :aria-invalid="invalid || undefined"
        @change="handleChange"
        @blur="handleBlur"
      >
        <NativeSelectOption value="">No country</NativeSelectOption>
        <NativeSelectOption v-for="code in countries" :key="code" :value="code">
          {{ origins[code] }}
        </NativeSelectOption>
      </NativeSelect>
    </LabelledField>
    <LabelledField
      v-slot="{ componentField, invalid }"
      name="city"
      label="City"
      input-id="roaster-city"
    >
      <Input
        id="roaster-city"
        v-bind="componentField"
        data-testid="roaster-city"
        autocomplete="off"
        :aria-invalid="invalid || undefined"
      />
    </LabelledField>
  </FieldGroup>
</template>
