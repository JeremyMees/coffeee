<script setup lang="ts">
import { CameraIcon, Trash2Icon } from '@lucide/vue'
import { useForm } from 'vee-validate'
import { useRoasterCreate, useRoasterLogoUpdate } from '~/queries/roasters'
import { buttonVariants } from '@/components/ui/button'

const open = defineModel<boolean>('open', { default: false })
const formError = ref('')
const logo = ref<File>()
const preview = ref('')
const { mutateAsync: createRoaster } = useRoasterCreate()
const { mutateAsync: updateLogo } = useRoasterLogoUpdate()

function emptyForm() {
  return { name: '', website: '', countryCode: '', city: '' }
}

const { handleSubmit, resetForm, setErrors, isSubmitting, values } = useForm({
  validationSchema: zodSchema(roasterDetailsSchema),
  initialValues: emptyForm(),
})

function pickLogo(file?: File) {
  if (preview.value) URL.revokeObjectURL(preview.value)

  logo.value = file
  preview.value = file ? URL.createObjectURL(file) : ''
}

watch(open, isOpen => {
  if (!isOpen) return

  formError.value = ''
  pickLogo()
  resetForm({ values: emptyForm() })
})

onBeforeUnmount(() => pickLogo())

function picked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (file) pickLogo(file)
}

const add = handleSubmit(async details => {
  formError.value = ''

  let roaster: { id: string; name: string }

  try {
    roaster = await createRoaster(details)
  } catch (error) {
    const { fields, message } = serverErrors(error)

    setErrors(fields)
    formError.value = message
    return
  }

  if (logo.value) {
    try {
      await updateLogo({ roasterId: roaster.id, logo: logo.value })
    } catch (error) {
      formError.value = `${roaster.name} was added, but its logo was not: ${serverErrors(error).message}`
      return
    }
  }

  open.value = false
})
</script>

<template>
  <FormSheet
    v-model:open="open"
    data-testid="add-roaster-sheet"
    title="Add roaster"
    description="Add a roastery with its logo, website and where it roasts."
  >
    <form
      class="flex flex-col gap-6 px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:px-8"
      novalidate
      data-testid="add-roaster-form"
      @submit="add"
    >
      <div
        class="flex flex-wrap items-center gap-3 text-xs uppercase"
        data-testid="add-roaster-logo"
      >
        <div
          class="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full border bg-background"
        >
          <img
            v-if="preview"
            :src="preview"
            :alt="`The logo of ${values.name || 'the roaster'}`"
            class="size-full object-contain"
            data-testid="add-roaster-logo-preview"
          />
          <span
            v-else
            class="font-sans text-xl font-semibold uppercase"
            aria-hidden="true"
          >
            {{ values.name?.charAt(0) }}
          </span>
        </div>
        <label
          :class="
            buttonVariants({
              variant: 'line',
              size: 'pill-sm',
              class:
                'cursor-pointer focus-within:ring-2 focus-within:ring-ring',
            })
          "
        >
          <CameraIcon class="size-4" aria-hidden="true" />
          {{ logo ? 'Replace logo' : 'Add logo' }}
          <input
            type="file"
            accept="image/*"
            class="sr-only"
            data-testid="add-roaster-logo-input"
            @change="picked"
          />
        </label>
        <Button
          v-if="logo"
          type="button"
          data-testid="add-roaster-logo-remove"
          variant="ghost-destructive"
          size="pill-sm"
          @click="pickLogo()"
        >
          <Trash2Icon class="size-4" aria-hidden="true" />
          Remove logo
        </Button>
      </div>

      <LazyRoasterFields />

      <Alert v-if="formError" variant="destructive" data-testid="form-error">
        <AlertDescription>{{ formError }}</AlertDescription>
      </Alert>

      <Button
        type="submit"
        data-testid="add-roaster-submit"
        size="pill"
        :disabled="isSubmitting"
      >
        Add roaster
      </Button>
    </form>
  </FormSheet>
</template>
