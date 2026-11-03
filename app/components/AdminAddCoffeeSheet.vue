<script setup lang="ts">
import { useForm } from 'vee-validate'
import { useAdminEntryCreate } from '~/queries/admin'

const open = defineModel<boolean>('open', { default: false })
const formError = ref('')
const step = ref(1)
const steps = coffeeFormSteps(false)
const { mutateAsync: createEntry } = useAdminEntryCreate()

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
  }
}

const { handleSubmit, resetForm, setErrors, isSubmitting } = useForm({
  validationSchema: zodSchema(coffeeDetailsSchema),
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
  async details => {
    formError.value = ''

    try {
      await createEntry({ list: 'coffees', body: details })

      open.value = false
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
    data-testid="admin-add-coffee-sheet"
    title="Add coffee"
    description="Add it to the catalog without a bag on any shelf."
  >
    <form
      class="px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:px-8"
      novalidate
      data-testid="admin-add-coffee-form"
      @submit="add"
    >
      <CoffeeFormSteps v-model="step" :steps="steps" prefix="admin-add-coffee">
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
            data-testid="admin-add-coffee-submit"
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
