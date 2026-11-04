<script setup lang="ts">
import { useForm } from 'vee-validate'
import { useCoffeeCreate } from '~/queries/coffees'

const open = useAddCoffee()
const shelf = useCurrentShelf()
const formError = ref('')
const step = ref(1)
const steps = coffeeFormSteps(true)
const { mutateAsync: createCoffee } = useCoffeeCreate()

function emptyForm() {
  return {
    name: '',
    roaster: '',
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
  step.value = 1
  resetForm({ values: emptyForm() })
})

function showErrors(fields: string[]) {
  step.value = firstStepWithError(steps, fields) ?? step.value
}

const add = handleSubmit(
  async coffee => {
    if (!shelf.value) return

    formError.value = ''

    try {
      await createCoffee({ shelfId: shelf.value.id, coffee })

      open.value = false

      await navigateTo(shelfPath(shelf.value))
    } catch (error) {
      const { fields, message } = serverErrors(error)

      setErrors(fields)
      showErrors(Object.keys(fields))
      formError.value = message
    }
  },
  ({ errors }) => showErrors(Object.keys(errors)),
)
</script>

<template>
  <FormSheet
    v-model:open="open"
    data-testid="add-coffee-sheet"
    title="Add coffee"
    description="A coffee you just bought, with its first bag."
  >
    <form
      class="px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:px-8"
      novalidate
      data-testid="add-coffee-form"
      @submit="add"
    >
      <CoffeeFormSteps v-model="step" :steps="steps" prefix="add-coffee">
        <template #error>
          <Alert
            v-if="formError"
            variant="destructive"
            data-testid="form-error"
          >
            <AlertDescription>{{ formError }}</AlertDescription>
          </Alert>
        </template>
        <template #submit>
          <button
            type="submit"
            data-testid="add-coffee-submit"
            class="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground uppercase disabled:opacity-60"
            :disabled="isSubmitting"
          >
            Add coffee
          </button>
        </template>
      </CoffeeFormSteps>
    </form>
  </FormSheet>
</template>
