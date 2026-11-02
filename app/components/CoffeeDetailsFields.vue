<script setup lang="ts">
import { Field as VeeField } from 'vee-validate'

const roastLevelOptions = roastLevels.map(value => ({
  value,
  label: roastLevelLabels[value],
}))
const roastedForChoices = roastedForOptions.map(value => ({
  value,
  label: roastedForLabels[value],
}))
</script>

<template>
  <FieldGroup>
    <VeeField v-slot="{ componentField, errors }" name="name">
      <Field :data-invalid="errors.length ? true : undefined">
        <FieldLabel for="coffee-name">Coffee</FieldLabel>
        <Input
          id="coffee-name"
          v-bind="componentField"
          data-testid="coffee-name"
          autocomplete="off"
          :aria-invalid="errors.length ? true : undefined"
        />
        <FieldError :errors="errors" />
      </Field>
    </VeeField>

    <VeeField v-slot="{ componentField, errors }" name="roaster">
      <Field :data-invalid="errors.length ? true : undefined">
        <FieldLabel for="coffee-roaster">Roaster</FieldLabel>
        <RoasterPicker
          id="coffee-roaster"
          v-bind="componentField"
          data-testid="coffee-roaster"
          :invalid="errors.length > 0"
        />
        <FieldError :errors="errors" />
      </Field>
    </VeeField>

    <VeeField v-slot="{ componentField, errors }" name="roastLevel">
      <FieldSet :data-invalid="errors.length ? true : undefined">
        <FieldLegend variant="label">Roast level</FieldLegend>
        <OptionPills
          v-bind="componentField"
          name="roastLevel"
          data-testid="coffee-roast-level"
          :options="roastLevelOptions"
          :invalid="errors.length > 0"
        />
        <FieldError :errors="errors" />
      </FieldSet>
    </VeeField>

    <VeeField v-slot="{ componentField, errors }" name="roastedFor">
      <FieldSet :data-invalid="errors.length ? true : undefined">
        <FieldLegend variant="label">Roasted for</FieldLegend>
        <OptionPills
          v-bind="componentField"
          name="roastedFor"
          data-testid="coffee-roasted-for"
          :options="roastedForChoices"
          :invalid="errors.length > 0"
        />
        <FieldError :errors="errors" />
      </FieldSet>
    </VeeField>

    <VeeField v-slot="{ value, handleChange, errors }" name="colour">
      <FieldSet :data-invalid="errors.length ? true : undefined">
        <FieldLegend variant="label">Bag colour</FieldLegend>
        <div class="flex flex-wrap gap-2" data-testid="coffee-colour">
          <label
            v-for="colour in bagColours"
            :key="colour"
            class="size-9 cursor-pointer rounded-full ring-offset-2 ring-offset-background has-checked:ring-2 has-checked:ring-primary has-focus-visible:ring-2 has-focus-visible:ring-ring"
            :style="{ backgroundColor: colour }"
            :title="bagColourNames[colour]"
          >
            <input
              type="radio"
              name="colour"
              class="sr-only"
              :value="colour"
              :checked="value === colour"
              :aria-label="bagColourNames[colour]"
              :data-testid="`colour-${bagColourNames[colour].toLowerCase()}`"
              @change="handleChange(colour)"
            />
          </label>
        </div>
        <FieldError :errors="errors" />
      </FieldSet>
    </VeeField>
  </FieldGroup>
</template>
