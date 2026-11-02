<script setup lang="ts">
import { useForm } from 'vee-validate'
import { useRoasterUpdate } from '~/queries/roasters'

const props = defineProps<{ shelfId: string; roaster: ShelfRoaster }>()

const open = defineModel<boolean>('open', { default: false })
const formError = ref('')
const { mutateAsync: updateRoaster } = useRoasterUpdate()

const countries = [...originCodes].sort((a, b) =>
  origins[a].localeCompare(origins[b]),
)

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
    await updateRoaster({
      shelfId: props.shelfId,
      roasterId: props.roaster.id,
      details,
    })

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
      <RoasterLogo :shelf-id="shelfId" :roaster="roaster" />
      <form
        class="flex flex-col gap-6"
        novalidate
        data-testid="edit-roaster-form"
        @submit="save"
      >
        <FieldGroup>
          <LabelledField
            v-slot="{ componentField, invalid }"
            name="name"
            label="Name"
            input-id="roaster-name"
          >
            <Input
              id="roaster-name"
              v-bind="componentField"
              data-testid="roaster-name"
              autocomplete="off"
              :aria-invalid="invalid || undefined"
            />
          </LabelledField>
          <LabelledField
            v-slot="{ componentField, invalid }"
            name="website"
            label="Website"
            input-id="roaster-website"
          >
            <Input
              id="roaster-website"
              v-bind="componentField"
              data-testid="roaster-website"
              type="url"
              inputmode="url"
              autocomplete="off"
              :aria-invalid="invalid || undefined"
            />
          </LabelledField>
          <LabelledField
            v-slot="{ value, handleChange, handleBlur, invalid }"
            name="countryCode"
            label="Country"
            input-id="roaster-country"
          >
            <NativeSelect
              id="roaster-country"
              :model-value="value"
              name="countryCode"
              class="w-full"
              data-testid="roaster-country"
              :aria-invalid="invalid || undefined"
              @change="handleChange"
              @blur="handleBlur"
            >
              <NativeSelectOption value="">No country</NativeSelectOption>
              <NativeSelectOption
                v-for="code in countries"
                :key="code"
                :value="code"
              >
                {{ origins[code] }}
              </NativeSelectOption>
            </NativeSelect>
          </LabelledField>
          <LabelledField
            v-slot="{ componentField, invalid }"
            name="city"
            label="City"
            input-id="roaster-city"
          >
            <Input
              id="roaster-city"
              v-bind="componentField"
              data-testid="roaster-city"
              autocomplete="off"
              :aria-invalid="invalid || undefined"
            />
          </LabelledField>
        </FieldGroup>

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
