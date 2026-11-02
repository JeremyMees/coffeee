<template>
  <FieldGroup>
    <LabelledField
      v-slot="{ componentField, invalid }"
      name="name"
      label="Coffee"
      input-id="coffee-name"
    >
      <Input
        id="coffee-name"
        v-bind="componentField"
        data-testid="coffee-name"
        autocomplete="off"
        :aria-invalid="invalid || undefined"
      />
    </LabelledField>

    <LabelledField
      v-slot="{ value, handleChange, handleBlur, invalid }"
      name="roaster"
      label="Roaster"
      input-id="coffee-roaster"
    >
      <ListPicker
        id="coffee-roaster"
        :model-value="value"
        endpoint="/api/roasters"
        placeholder="Search or add a roaster"
        hint="Type the roaster's name"
        data-testid="coffee-roaster"
        :invalid="invalid"
        @update:model-value="handleChange"
        @blur="handleBlur"
      />
    </LabelledField>

    <CoffeeOriginFields />

    <LabelledField
      v-slot="{ value, handleChange, handleBlur, invalid }"
      name="producers"
      label="Producer"
      input-id="coffee-producers"
    >
      <MultiListPicker
        id="coffee-producers"
        :model-value="value"
        endpoint="/api/producers"
        placeholder="Search or add a producer"
        hint="Type the producer's name"
        data-testid="coffee-producers"
        :invalid="invalid"
        @update:model-value="handleChange"
        @blur="handleBlur"
      />
    </LabelledField>

    <CoffeeRoastFields />
  </FieldGroup>
</template>
