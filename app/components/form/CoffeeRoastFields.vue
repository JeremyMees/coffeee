<script setup lang="ts">
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
  <LegendField
    v-slot="{ componentField, invalid }"
    name="roastLevel"
    legend="Roast level"
  >
    <OptionPills
      v-bind="componentField"
      name="roastLevel"
      data-testid="coffee-roast-level"
      :options="roastLevelOptions"
      :invalid="invalid"
    />
  </LegendField>

  <LegendField
    v-slot="{ componentField, invalid }"
    name="roastedFor"
    legend="Roasted for"
  >
    <OptionPills
      v-bind="componentField"
      name="roastedFor"
      data-testid="coffee-roasted-for"
      :options="roastedForChoices"
      :invalid="invalid"
    />
  </LegendField>
</template>
