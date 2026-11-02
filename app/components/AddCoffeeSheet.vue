<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { Field as VeeField, useForm } from 'vee-validate'

const open = useAddCoffee()
const shelf = useCurrentShelf()
const desktop = useMediaQuery('(min-width: 1024px)')
const formError = ref('')

const roastLevelOptions = roastLevels.map(value => ({
  value,
  label: roastLevelLabels[value],
}))
const roastedForChoices = roastedForOptions.map(value => ({
  value,
  label: roastedForLabels[value],
}))

function emptyForm() {
  return {
    name: '',
    roaster: '',
    colour: bagColours[Math.floor(Math.random() * bagColours.length)]!,
    purchasedOn: localDate(),
    roastedOn: '',
    sizeGrams: '',
    price: '',
  }
}

const { handleSubmit, resetForm, setErrors, isSubmitting } = useForm({
  validationSchema: zodSchema(newCoffeeSchema),
  initialValues: emptyForm(),
})

watch(open, isOpen => {
  if (!isOpen) return

  formError.value = ''
  resetForm({ values: emptyForm() })
})

const add = handleSubmit(async coffee => {
  if (!shelf.value) return

  formError.value = ''

  try {
    await $fetch(`/api/shelves/${shelf.value.id}/coffees`, {
      method: 'POST',
      body: coffee,
    })

    open.value = false

    await navigateTo(`/shelves/${shelf.value.id}`)
    await refreshNuxtData([`stock:${shelf.value.id}`, 'roasters'])
  } catch (error) {
    const { fields, message } = serverErrors(error)

    setErrors(fields)
    formError.value = message
  }
})
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent
      :side="desktop ? 'right' : 'bottom'"
      class="max-h-[92dvh] gap-0 overflow-y-auto rounded-t-[28px] border-primary bg-background font-mono lg:max-h-none lg:max-w-md! lg:rounded-none"
    >
      <SheetHeader class="px-5 pt-6 lg:px-8 lg:pt-10">
        <SheetTitle
          class="font-sans text-[40px] leading-[0.9] font-semibold tracking-[-0.045em] text-primary"
        >
          Add coffee
        </SheetTitle>
        <SheetDescription class="text-xs text-primary">
          A coffee you just bought, with its first bag.
        </SheetDescription>
      </SheetHeader>

      <form
        class="flex flex-col gap-6 px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:px-8"
        novalidate
        @submit="add"
      >
        <FieldGroup>
          <VeeField v-slot="{ componentField, errors }" name="name">
            <Field :data-invalid="errors.length ? true : undefined">
              <FieldLabel for="coffee-name">Coffee</FieldLabel>
              <Input
                id="coffee-name"
                v-bind="componentField"
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
                :options="roastedForChoices"
                :invalid="errors.length > 0"
              />
              <FieldError :errors="errors" />
            </FieldSet>
          </VeeField>

          <VeeField v-slot="{ value, handleChange, errors }" name="colour">
            <FieldSet :data-invalid="errors.length ? true : undefined">
              <FieldLegend variant="label">Bag colour</FieldLegend>
              <div class="flex flex-wrap gap-2">
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
                    @change="handleChange(colour)"
                  />
                </label>
              </div>
              <FieldError :errors="errors" />
            </FieldSet>
          </VeeField>
        </FieldGroup>

        <FieldSet class="border-t pt-6">
          <FieldLegend>First bag</FieldLegend>
          <FieldGroup class="grid grid-cols-2 gap-4">
            <VeeField v-slot="{ componentField, errors }" name="purchasedOn">
              <Field :data-invalid="errors.length ? true : undefined">
                <FieldLabel for="purchased-on">Bought on</FieldLabel>
                <Input
                  id="purchased-on"
                  v-bind="componentField"
                  type="date"
                  :aria-invalid="errors.length ? true : undefined"
                />
                <FieldError :errors="errors" />
              </Field>
            </VeeField>
            <VeeField v-slot="{ componentField, errors }" name="roastedOn">
              <Field :data-invalid="errors.length ? true : undefined">
                <FieldLabel for="roasted-on">Roasted on</FieldLabel>
                <Input
                  id="roasted-on"
                  v-bind="componentField"
                  type="date"
                  :aria-invalid="errors.length ? true : undefined"
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
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="0.01"
                  :aria-invalid="errors.length ? true : undefined"
                />
                <FieldError :errors="errors" />
              </Field>
            </VeeField>
          </FieldGroup>
        </FieldSet>

        <Alert v-if="formError" variant="destructive">
          <AlertDescription>{{ formError }}</AlertDescription>
        </Alert>

        <button
          type="submit"
          class="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground uppercase disabled:opacity-60"
          :disabled="isSubmitting"
        >
          Add coffee
        </button>
      </form>
    </SheetContent>
  </Sheet>
</template>
