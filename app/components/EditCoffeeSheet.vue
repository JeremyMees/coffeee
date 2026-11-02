<script setup lang="ts">
import { useForm } from 'vee-validate'

const props = defineProps<{
  shelfId: string
  coffee: {
    id: string
    name: string
    roaster: string
    roastLevel: RoastLevel
    roastedFor: RoastedFor
    colour: string
  }
}>()

const emit = defineEmits<{ saved: [] }>()

const open = defineModel<boolean>('open', { default: false })
const formError = ref('')

function currentDetails() {
  return {
    name: props.coffee.name,
    roaster: props.coffee.roaster,
    roastLevel: props.coffee.roastLevel,
    roastedFor: props.coffee.roastedFor,
    colour: props.coffee.colour as BagColour,
  }
}

const { handleSubmit, resetForm, setErrors, isSubmitting } = useForm({
  validationSchema: zodSchema(coffeeDetailsSchema),
  initialValues: currentDetails(),
})

watch(open, isOpen => {
  if (!isOpen) return

  formError.value = ''
  resetForm({ values: currentDetails() })
})

const save = handleSubmit(async details => {
  formError.value = ''

  try {
    await $fetch(`/api/shelves/${props.shelfId}/coffees/${props.coffee.id}`, {
      method: 'PATCH',
      body: details,
    })

    open.value = false
    emit('saved')
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
    data-testid="edit-coffee-sheet"
    title="Edit coffee"
    description="Fix its details for everyone who has it on a shelf."
  >
    <form
      class="flex flex-col gap-6 px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:px-8"
      novalidate
      data-testid="edit-coffee-form"
      @submit="save"
    >
      <CoffeeDetailsFields />

      <Alert v-if="formError" variant="destructive" data-testid="form-error">
        <AlertDescription>{{ formError }}</AlertDescription>
      </Alert>

      <button
        type="submit"
        data-testid="edit-coffee-submit"
        class="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground uppercase disabled:opacity-60"
        :disabled="isSubmitting"
      >
        Save changes
      </button>
    </form>
  </FormSheet>
</template>
