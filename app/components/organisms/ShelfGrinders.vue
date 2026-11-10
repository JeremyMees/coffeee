<script setup lang="ts">
import { PlusIcon, XIcon } from '@lucide/vue'
import { useForm } from 'vee-validate'
import {
  useGrinderDisown,
  useGrinderOwn,
  useShelfGrinders,
} from '~/queries/grinders'

const props = defineProps<{ shelfId: string }>()

const owned = useShelfGrinders(() => props.shelfId)

const { mutateAsync: ownGrinder } = useGrinderOwn()
const { mutateAsync: disownGrinder, isPending: removing } = useGrinderDisown()

const formError = ref('')
const removeError = ref('')
const added = ref(0)

const { handleSubmit, resetForm, setErrors, isSubmitting, values } = useForm({
  validationSchema: zodSchema(newGrinderSchema),
  initialValues: { brand: '', model: '' },
})

const add = handleSubmit(async grinder => {
  formError.value = ''

  try {
    await ownGrinder({ shelfId: props.shelfId, grinder })

    resetForm()
    added.value++
  } catch (caught) {
    const { fields, message } = serverErrors(caught)

    setErrors(fields)
    formError.value = message
  }
})

async function remove(grinderId: string) {
  removeError.value = ''

  try {
    await disownGrinder({ shelfId: props.shelfId, grinderId })
  } catch (caught) {
    removeError.value = serverErrors(caught).message
  }
}
</script>

<template>
  <section class="flex flex-col gap-4" data-testid="shelf-grinders">
    <div>
      <h2 class="text-[28px]">Grinders</h2>
      <p class="mt-1 text-xs">
        The grinders this shelf owns. Each coffee keeps a grind setting per
        grinder and brew method.
      </p>
    </div>
    <QuerySection :query="owned" testid="shelf-grinders">
      <template #default="{ data: grinders }">
        <p
          v-if="!grinders.length"
          class="text-xs"
          data-testid="shelf-grinders-empty"
        >
          No grinders on this shelf yet.
        </p>
        <ul v-else class="divide-y rounded-[18px] border text-xs">
          <li
            v-for="grinder in grinders"
            :key="grinder.id"
            data-testid="shelf-grinder"
            class="flex items-center justify-between gap-4 px-4 py-3"
          >
            <span data-testid="shelf-grinder-name">{{
              grinderName(grinder)
            }}</span>
            <Button
              type="button"
              data-testid="shelf-grinder-remove"
              :aria-label="`Remove ${grinderName(grinder)}`"
              :disabled="removing"
              variant="ghost"
              size="icon-sm"
              @click="remove(grinder.id)"
            >
              <XIcon class="size-4" aria-hidden="true" />
            </Button>
          </li>
        </ul>
      </template>
      <template #skeleton><ShelfGrindersSkeleton /></template>
    </QuerySection>
    <Alert
      v-if="removeError"
      variant="destructive"
      data-testid="shelf-grinder-remove-error"
    >
      <AlertDescription>{{ removeError }}</AlertDescription>
    </Alert>
    <form
      :key="added"
      class="flex flex-col gap-4"
      novalidate
      data-testid="grinder-form"
      @submit="add"
    >
      <FieldGroup class="grid gap-4 sm:grid-cols-2">
        <LabelledField
          v-slot="{ value, handleChange, handleBlur, invalid }"
          name="brand"
          label="Brand"
          input-id="grinder-brand"
        >
          <ListPicker
            id="grinder-brand"
            :model-value="value"
            endpoint="/api/grinder-brands"
            placeholder="Search or add a brand"
            hint="Type the grinder's brand"
            data-testid="grinder-brand"
            :invalid="invalid"
            @update:model-value="handleChange"
            @blur="handleBlur"
          />
        </LabelledField>
        <LabelledField
          v-slot="{ value, handleChange, handleBlur, invalid }"
          name="model"
          label="Model"
          input-id="grinder-model"
        >
          <ListPicker
            id="grinder-model"
            :model-value="value"
            endpoint="/api/grinders"
            :params="{ brand: values.brand ?? '' }"
            placeholder="Search or add a model"
            hint="Type the grinder's model"
            data-testid="grinder-model"
            :invalid="invalid"
            @update:model-value="handleChange"
            @blur="handleBlur"
          />
        </LabelledField>
      </FieldGroup>
      <Alert v-if="formError" variant="destructive" data-testid="form-error">
        <AlertDescription>{{ formError }}</AlertDescription>
      </Alert>
      <Button
        type="submit"
        data-testid="grinder-submit"
        variant="outline"
        size="sm"
        class="w-fit"
        :disabled="isSubmitting"
      >
        <PlusIcon class="size-4" aria-hidden="true" />
        Add grinder
      </Button>
    </form>
  </section>
</template>
