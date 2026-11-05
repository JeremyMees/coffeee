<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { useForm } from 'vee-validate'

const props = defineProps<{
  prefix: string
  title: string
  description: string
  submitLabel: string
  send: (coffee: NewCoffee) => Promise<unknown>
  goTo?: () => RouteLocationRaw | undefined
  coffee?: EditableCoffee
  firstBag?: boolean
}>()

const open = defineModel<boolean>('open', { default: false })
const formError = ref('')
const step = ref(1)
const steps = coffeeFormSteps(props.firstBag)

function startValues() {
  return {
    ...coffeeFormValues(props.coffee),
    ...(props.firstBag ? purchaseFormValues(undefined) : {}),
  }
}

const { handleSubmit, resetForm, setErrors, isSubmitting } = useForm({
  validationSchema: zodSchema(
    props.firstBag ? newCoffeeSchema : coffeeDetailsSchema,
  ),
  initialValues: startValues(),
})

watch(open, isOpen => {
  if (!isOpen) return

  formError.value = ''
  step.value = 1
  resetForm({ values: startValues() })
})

function showErrors(fields: string[]) {
  step.value = firstStepWithError(steps, fields) ?? step.value
}

const save = handleSubmit(
  async coffee => {
    formError.value = ''

    try {
      await props.send(coffee as NewCoffee)

      open.value = false

      const destination = props.goTo?.()

      if (destination) await navigateTo(destination)
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
    :data-testid="`${prefix}-sheet`"
    :title="title"
    :description="description"
  >
    <form
      class="px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:px-8"
      novalidate
      :data-testid="`${prefix}-form`"
      @submit="save"
    >
      <CoffeeFormSteps v-model="step" :steps="steps" :prefix="prefix">
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
            :data-testid="`${prefix}-submit`"
            class="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground uppercase disabled:opacity-60"
            :disabled="isSubmitting"
          >
            {{ submitLabel }}
          </button>
        </template>
      </CoffeeFormSteps>
    </form>
  </FormSheet>
</template>
