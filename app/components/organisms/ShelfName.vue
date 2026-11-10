<script setup lang="ts">
import { useForm } from 'vee-validate'
import { useShelfRename } from '~/queries/shelves'

const props = defineProps<{ shelfId: string }>()

const user = useCurrentUser()
const shelf = computed(() =>
  user.value?.shelves.find(found => found.id === props.shelfId),
)
const isOwner = computed(() => shelf.value?.ownerId === user.value?.id)

const { mutateAsync: rename } = useShelfRename()
const formError = ref('')
const renamed = ref(false)

const { handleSubmit, setErrors, isSubmitting } = useForm({
  validationSchema: zodSchema(newShelfSchema),
  initialValues: { name: shelf.value?.name ?? '' },
})

const save = handleSubmit(async ({ name }) => {
  formError.value = ''
  renamed.value = false

  try {
    await rename({ shelfId: props.shelfId, name })

    renamed.value = true
  } catch (caught) {
    const { fields, message } = serverErrors(caught)

    setErrors(fields)
    formError.value = message
  }
})
</script>

<template>
  <section class="flex flex-col gap-4" data-testid="shelf-name">
    <div>
      <h2 class="text-[28px]">Name</h2>
      <p v-if="!isOwner" class="mt-1 text-xs" data-testid="shelf-name-locked">
        {{ shelf?.name }}. Only the shelf owner can rename it.
      </p>
    </div>
    <form
      v-if="isOwner"
      class="flex flex-col gap-3"
      novalidate
      data-testid="shelf-name-form"
      @submit="save"
    >
      <LabelledField
        v-slot="{ componentField, invalid }"
        name="name"
        label="Shelf name"
        input-id="shelf-name-input"
      >
        <Input
          id="shelf-name-input"
          v-bind="componentField"
          data-testid="shelf-name-input"
          autocomplete="off"
          :aria-invalid="invalid || undefined"
        />
      </LabelledField>
      <Alert v-if="renamed" data-testid="shelf-name-saved">
        <AlertDescription>Shelf renamed.</AlertDescription>
      </Alert>
      <Alert
        v-if="formError"
        variant="destructive"
        data-testid="shelf-name-error"
      >
        <AlertDescription>{{ formError }}</AlertDescription>
      </Alert>
      <Button
        type="submit"
        data-testid="shelf-name-submit"
        size="pill"
        class="self-start"
        :disabled="isSubmitting"
      >
        Rename
      </Button>
    </form>
  </section>
</template>
