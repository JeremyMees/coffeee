<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { useForm } from 'vee-validate'
import { useCoffeePhotoRemoval, useCoffeePhotoUpdate } from '~/queries/coffees'

const props = defineProps<{
  prefix: string
  title: string
  description: string
  submitLabel: string
  send: (coffee: NewCoffee) => Promise<string>
  goTo?: () => RouteLocationRaw | undefined
  coffee?: EditableCoffee
  photoUrl?: string | null
  firstBag?: boolean
}>()

const open = defineModel<boolean>('open', { default: false })
const formError = ref('')
const step = ref(1)
const photo = ref<File | null>()
const savedId = ref<string>()
const steps = coffeeFormSteps(props.firstBag)

function startValues() {
  return {
    ...coffeeFormValues(props.coffee),
    ...(props.firstBag ? purchaseFormValues(undefined) : {}),
  }
}

const { mutateAsync: updatePhoto } = useCoffeePhotoUpdate()
const { mutateAsync: removePhoto } = useCoffeePhotoRemoval()

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
  photo.value = undefined
  savedId.value = undefined
  resetForm({ values: startValues() })
})

function showErrors(fields: string[]) {
  step.value = firstStepWithError(steps, fields) ?? step.value
}

function savePhoto(coffeeId: string) {
  if (photo.value === undefined) return

  return photo.value
    ? updatePhoto({ coffeeId, photo: photo.value })
    : removePhoto(coffeeId)
}

function showFailure(error: unknown) {
  const { fields, message } = serverErrors(error)

  setErrors(fields)
  showErrors(Object.keys(fields))
  formError.value = message
}

const save = handleSubmit(
  async coffee => {
    formError.value = ''

    try {
      if (props.coffee || !savedId.value) {
        savedId.value = await props.send(coffee as NewCoffee)
      }
    } catch (error) {
      showFailure(error)
      return
    }

    try {
      await savePhoto(savedId.value)
    } catch (error) {
      formError.value = `${coffee.name} was saved, but its photo was not: ${serverErrors(error).message}`
      return
    }

    open.value = false

    const destination = props.goTo?.()

    if (destination) await navigateTo(destination)
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
        <template #photo>
          <CoffeePhotoField
            v-model="photo"
            :prefix="prefix"
            :current-url="photoUrl"
          />
        </template>
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
