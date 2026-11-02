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

    <CoffeeListFields />

    <LabelledField
      v-slot="{ componentField, invalid }"
      name="link"
      label="Link"
      input-id="coffee-link"
    >
      <Input
        id="coffee-link"
        v-bind="componentField"
        data-testid="coffee-link"
        type="url"
        inputmode="url"
        autocomplete="off"
        :aria-invalid="invalid || undefined"
      />
    </LabelledField>

    <CoffeeRoastFields />
  </FieldGroup>
</template>
