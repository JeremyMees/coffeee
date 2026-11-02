<script setup lang="ts">
import {
  Field as VeeField,
  useFieldValue,
  useSetFieldValue,
} from 'vee-validate'

const roastLevelOptions = roastLevels.map(value => ({
  value,
  label: roastLevelLabels[value],
}))
const roastedForChoices = roastedForOptions.map(value => ({
  value,
  label: roastedForLabels[value],
}))

const pickedOrigins = useFieldValue<string[]>('origins')
const pickedRegions =
  useFieldValue<{ origin: string; name: string }[]>('regions')
const setRegions = useSetFieldValue('regions')

watch(pickedOrigins, codes => {
  const regions = pickedRegions.value
  const kept = regions.filter(region => codes.includes(region.origin))

  if (kept.length !== regions.length) setRegions(kept)
})
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

    <VeeField
      v-slot="{ value, handleChange, handleBlur, errors }"
      name="roaster"
    >
      <Field :data-invalid="errors.length ? true : undefined">
        <FieldLabel for="coffee-roaster">Roaster</FieldLabel>
        <ListPicker
          id="coffee-roaster"
          :model-value="value"
          endpoint="/api/roasters"
          placeholder="Search or add a roaster"
          hint="Type the roaster's name"
          data-testid="coffee-roaster"
          :invalid="errors.length > 0"
          @update:model-value="handleChange"
          @blur="handleBlur"
        />
        <FieldError :errors="errors" />
      </Field>
    </VeeField>

    <VeeField
      v-slot="{ value, handleChange, handleBlur, errors }"
      name="origins"
    >
      <Field :data-invalid="errors.length ? true : undefined">
        <FieldLabel for="coffee-origins">Origin</FieldLabel>
        <OriginPicker
          id="coffee-origins"
          :model-value="value"
          data-testid="coffee-origins"
          :invalid="errors.length > 0"
          @update:model-value="handleChange"
          @blur="handleBlur"
        />
        <FieldError :errors="errors" />
      </Field>
    </VeeField>

    <VeeField
      v-slot="{ value, handleChange, handleBlur, errors }"
      name="regions"
    >
      <Field :data-invalid="errors.length ? true : undefined">
        <FieldLabel for="coffee-regions">Region</FieldLabel>
        <ScopedListPicker
          id="coffee-regions"
          :model-value="value"
          endpoint="/api/regions"
          :origins="pickedOrigins"
          placeholder="Search or add a region"
          hint="Type the region's name"
          data-testid="coffee-regions"
          :invalid="errors.length > 0"
          @update:model-value="handleChange"
          @blur="handleBlur"
        />
        <FieldError :errors="errors" />
      </Field>
    </VeeField>

    <FieldSet>
      <FieldLegend variant="label">Altitude</FieldLegend>
      <div class="grid grid-cols-2 gap-3">
        <VeeField v-slot="{ componentField, errors }" name="altitudeFrom">
          <Field :data-invalid="errors.length ? true : undefined">
            <FieldLabel for="coffee-altitude-from" class="text-xs">
              From (m)
            </FieldLabel>
            <Input
              id="coffee-altitude-from"
              v-bind="componentField"
              data-testid="coffee-altitude-from"
              inputmode="numeric"
              autocomplete="off"
              :aria-invalid="errors.length ? true : undefined"
            />
            <FieldError :errors="errors" />
          </Field>
        </VeeField>
        <VeeField v-slot="{ componentField, errors }" name="altitudeTo">
          <Field :data-invalid="errors.length ? true : undefined">
            <FieldLabel for="coffee-altitude-to" class="text-xs">
              To (m)
            </FieldLabel>
            <Input
              id="coffee-altitude-to"
              v-bind="componentField"
              data-testid="coffee-altitude-to"
              inputmode="numeric"
              autocomplete="off"
              :aria-invalid="errors.length ? true : undefined"
            />
            <FieldError :errors="errors" />
          </Field>
        </VeeField>
      </div>
    </FieldSet>

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
