<script setup lang="ts">
import { useForm } from 'vee-validate'
import { useRoasterUpdate } from '~/queries/roasters'

const props = defineProps<{ roaster: ShelfRoaster }>()

const open = defineModel<boolean>('open', { default: false })
const formError = ref('')
const { mutateAsync: updateRoaster } = useRoasterUpdate()

function currentDetails() {
  return {
    name: props.roaster.name,
    website: props.roaster.website ?? '',
    countryCode: props.roaster.countryCode ?? '',
    city: props.roaster.city ?? '',
  }
}

const { handleSubmit, resetForm, setErrors, isSubmitting } = useForm({
  validationSchema: zodSchema(roasterDetailsSchema),
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
    await updateRoaster({ roasterId: props.roaster.id, details })

    open.value = false
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
    data-testid="edit-roaster-sheet"
    title="Edit roaster"
    description="Fix its details for everyone who drinks its coffee."
  >
    <div
      class="flex flex-col gap-6 px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:px-8"
    >
      <RoasterLogo :roaster="roaster" />
      <form
        class="flex flex-col gap-6"
        novalidate
        data-testid="edit-roaster-form"
        @submit="save"
      >
        <RoasterFields />

        <Alert v-if="formError" variant="destructive" data-testid="form-error">
          <AlertDescription>{{ formError }}</AlertDescription>
        </Alert>

        <button
          type="submit"
          data-testid="edit-roaster-submit"
          class="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground uppercase disabled:opacity-60"
          :disabled="isSubmitting"
        >
          Save changes
        </button>
      </form>
    </div>
  </FormSheet>
</template>
