<script setup lang="ts">
import { useForm } from 'vee-validate'
import { useCoffeeCreate } from '~/queries/coffees'

const open = useAddCoffee()
const shelf = useCurrentShelf()
const formError = ref('')
const { mutateAsync: createCoffee } = useCoffeeCreate()

function emptyForm() {
  return {
    name: '',
    roaster: '',
    colour: bagColours[Math.floor(Math.random() * bagColours.length)]!,
    origins: [] as string[],
    regions: [] as OriginEntry[],
    farms: [] as OriginEntry[],
    washingStations: [] as OriginEntry[],
    producers: [] as string[],
    processes: [] as string[],
    varietals: [] as string[],
    flavorNotes: [] as string[],
    link: '',
    altitudeFrom: '',
    altitudeTo: '',
    ...purchaseFormValues(undefined),
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
    await createCoffee({ shelfId: shelf.value.id, coffee })

    open.value = false

    await navigateTo(`/shelves/${shelf.value.id}`)
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
        <PurchaseFields />
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
