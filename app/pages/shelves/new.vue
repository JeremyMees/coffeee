<script setup lang="ts">
import { Field as VeeField, useForm } from 'vee-validate'

useHead({ title: 'New shelf · Coffeee' })

const user = useCurrentUser()
const formError = ref('')

const { handleSubmit, setErrors, isSubmitting } = useForm({
  validationSchema: zodSchema(newShelfSchema),
  initialValues: { name: '' },
})

const create = handleSubmit(async body => {
  formError.value = ''

  try {
    const shelf = await $fetch('/api/shelves', { method: 'POST', body })

    user.value?.shelves.push(shelf)

    await navigateTo(shelfPath(shelf))
  } catch (caught) {
    const { fields, message } = serverErrors(caught)

    setErrors(fields)
    formError.value = message
  }
})
</script>

<template>
  <main>
    <PageHeader title="New shelf" />
    <p class="mt-3 max-w-md text-xs">
      A shelf keeps coffee apart, such as Home and Work. You can share it with
      other people later.
    </p>
    <form
      class="mt-8 flex max-w-md flex-col gap-4"
      novalidate
      data-testid="new-shelf-form"
      @submit="create"
    >
      <VeeField v-slot="{ componentField, errors }" name="name">
        <Field :data-invalid="errors.length ? true : undefined">
          <FieldLabel for="shelf-name">Name</FieldLabel>
          <Input
            id="shelf-name"
            v-bind="componentField"
            data-testid="shelf-name"
            autocomplete="off"
            :aria-invalid="errors.length ? true : undefined"
          />
          <FieldError :errors="errors" />
        </Field>
      </VeeField>
      <Alert v-if="formError" variant="destructive" data-testid="form-error">
        <AlertDescription>{{ formError }}</AlertDescription>
      </Alert>
      <Button
        type="submit"
        class="self-start"
        data-testid="new-shelf-submit"
        :disabled="isSubmitting"
      >
        Create shelf
      </Button>
    </form>
  </main>
</template>
