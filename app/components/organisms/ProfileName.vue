<script setup lang="ts">
import { useForm } from 'vee-validate'
import { useProfileRename } from '~/queries/account'

const user = useCurrentUser()

const { mutateAsync: rename } = useProfileRename()
const formError = ref('')
const renamed = ref(false)

const { handleSubmit, setErrors, isSubmitting } = useForm({
  validationSchema: zodSchema(profileNameSchema),
  initialValues: { name: user.value?.name ?? '' },
})

const save = handleSubmit(async ({ name }) => {
  formError.value = ''
  renamed.value = false

  try {
    await rename(name)

    renamed.value = true
  } catch (caught) {
    const { fields, message } = serverErrors(caught)

    setErrors(fields)
    formError.value = message
  }
})
</script>

<template>
  <form
    class="flex flex-col gap-3"
    novalidate
    data-testid="profile-name-form"
    @submit="save"
  >
    <LabelledField
      v-slot="{ componentField, invalid }"
      name="name"
      label="Name"
      input-id="profile-name-input"
    >
      <Input
        id="profile-name-input"
        v-bind="componentField"
        data-testid="profile-name-input"
        autocomplete="name"
        :aria-invalid="invalid || undefined"
      />
    </LabelledField>
    <Alert v-if="renamed" data-testid="profile-name-saved">
      <AlertDescription>Name saved.</AlertDescription>
    </Alert>
    <Alert
      v-if="formError"
      variant="destructive"
      data-testid="profile-name-error"
    >
      <AlertDescription>{{ formError }}</AlertDescription>
    </Alert>
    <Button
      type="submit"
      data-testid="profile-name-submit"
      class="self-start"
      :disabled="isSubmitting"
    >
      Save name
    </Button>
  </form>
</template>
