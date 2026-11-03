<script setup lang="ts">
import { useForm } from 'vee-validate'
import type { z } from 'zod'
import { useAdminEntryCreate, useAdminEntryUpdate } from '~/queries/admin'

const props = defineProps<{ list: AdminList; entry?: AdminEntry }>()

const open = defineModel<boolean>('open', { default: false })

const nouns = computed(() => adminListNouns[props.list])
const form = adminListForm(props.list)
const schemas = {
  name: entryNameSchema,
  origin: newOriginEntrySchema,
  grinder: newGrinderSchema,
}
const emptyValues: Record<typeof form, Record<string, string>> = {
  name: { name: '' },
  origin: { name: '', originCode: '' },
  grinder: { brand: '', model: '' },
}
const countries = [...originCodes].sort((a, b) =>
  origins[a].localeCompare(origins[b]),
)
const formError = ref('')
const { mutateAsync: createEntry } = useAdminEntryCreate()
const { mutateAsync: updateEntry } = useAdminEntryUpdate()

function startValues() {
  const { entry } = props

  if (!entry) return emptyValues[form]

  if (form === 'grinder')
    return { brand: entry.detail ?? '', model: entry.name }

  if (form === 'origin') {
    return { name: entry.name, originCode: entry.detailId ?? '' }
  }

  return { name: entry.name }
}

const { handleSubmit, resetForm, setErrors, isSubmitting } = useForm({
  validationSchema: zodSchema(
    schemas[form] as unknown as z.ZodType<Record<string, string>>,
  ),
  initialValues: startValues(),
})

watch(open, isOpen => {
  if (!isOpen) return

  formError.value = ''
  resetForm({ values: startValues() })
})

const save = handleSubmit(async body => {
  formError.value = ''

  try {
    if (props.entry) {
      await updateEntry({ list: props.list, entryId: props.entry.id, body })
    } else {
      await createEntry({ list: props.list, body })
    }

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
    :data-testid="entry ? 'admin-update-entry-sheet' : 'admin-add-entry-sheet'"
    :title="entry ? `Update ${entry.name}` : `Add ${nouns.one}`"
    :description="
      entry
        ? `Every coffee and shelf shows the changes to this ${nouns.one}.`
        : `Add a ${nouns.one} everyone can pick from.`
    "
  >
    <form
      class="flex flex-col gap-6 px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:px-8"
      novalidate
      :data-testid="entry ? 'admin-update-form' : 'admin-add-form'"
      @submit="save"
    >
      <FieldGroup>
        <template v-if="form === 'grinder'">
          <LabelledField
            v-slot="{ value, handleChange, handleBlur, invalid }"
            name="brand"
            label="Brand"
            input-id="admin-entry-brand"
          >
            <ListPicker
              id="admin-entry-brand"
              :model-value="value"
              endpoint="/api/grinder-brands"
              placeholder="Search or add a brand"
              hint="Type the grinder's brand"
              data-testid="admin-entry-brand"
              :invalid="invalid"
              @update:model-value="handleChange"
              @blur="handleBlur"
            />
          </LabelledField>
          <LabelledField
            v-slot="{ componentField, invalid }"
            name="model"
            label="Model"
            input-id="admin-entry-model"
          >
            <Input
              id="admin-entry-model"
              v-bind="componentField"
              data-testid="admin-entry-model"
              autocomplete="off"
              :aria-invalid="invalid || undefined"
            />
          </LabelledField>
        </template>
        <template v-else>
          <LabelledField
            v-if="form === 'origin'"
            v-slot="{ value, handleChange, handleBlur, invalid }"
            name="originCode"
            label="Country"
            input-id="admin-entry-country"
          >
            <NativeSelect
              id="admin-entry-country"
              :model-value="value"
              name="originCode"
              class="w-full"
              data-testid="admin-entry-country"
              :aria-invalid="invalid || undefined"
              @change="handleChange"
              @blur="handleBlur"
            >
              <NativeSelectOption value="">Pick a country</NativeSelectOption>
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
            name="name"
            label="Name"
            input-id="admin-entry-name"
          >
            <Input
              id="admin-entry-name"
              v-bind="componentField"
              data-testid="admin-entry-name"
              autocomplete="off"
              :aria-invalid="invalid || undefined"
            />
          </LabelledField>
        </template>
      </FieldGroup>

      <Alert v-if="formError" variant="destructive" data-testid="form-error">
        <AlertDescription>{{ formError }}</AlertDescription>
      </Alert>

      <button
        type="submit"
        :data-testid="entry ? 'admin-update-submit' : 'admin-add-submit'"
        class="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground uppercase disabled:opacity-60"
        :disabled="isSubmitting"
      >
        {{ entry ? 'Save changes' : `Add ${nouns.one}` }}
      </button>
    </form>
  </FormSheet>
</template>
