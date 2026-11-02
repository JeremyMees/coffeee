<script setup lang="ts">
import { Field as VeeField, useForm } from 'vee-validate'

const open = useAddCoffee()
const shelf = useCurrentShelf()
const formError = ref('')

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
  <FormSheet
    v-model:open="open"
    data-testid="add-coffee-sheet"
    title="Add coffee"
    description="A coffee you just bought, with its first bag."
  >
    <form
      class="flex flex-col gap-6 px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:px-8"
      novalidate
      data-testid="add-coffee-form"
      @submit="add"
    >
      <CoffeeDetailsFields />

      <FieldSet class="border-t pt-6">
        <FieldLegend>First bag</FieldLegend>
        <FieldGroup class="grid grid-cols-2 gap-4">
          <VeeField v-slot="{ componentField, errors }" name="purchasedOn">
            <Field :data-invalid="errors.length ? true : undefined">
              <FieldLabel for="purchased-on">Bought on</FieldLabel>
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

      <Alert v-if="formError" variant="destructive" data-testid="form-error">
        <AlertDescription>{{ formError }}</AlertDescription>
      </Alert>

      <button
        type="submit"
        data-testid="add-coffee-submit"
        class="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground uppercase disabled:opacity-60"
        :disabled="isSubmitting"
      >
        Add coffee
      </button>
    </form>
  </FormSheet>
</template>
