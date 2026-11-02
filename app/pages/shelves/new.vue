<script setup lang="ts">
useHead({ title: 'New shelf · Coffeee' })

const user = useCurrentUser()
const name = ref('')
const error = ref('')
const creating = ref(false)

async function create() {
  creating.value = true
  error.value = ''

  try {
    const shelf = await $fetch('/api/shelves', {
      method: 'POST',
      body: { name: name.value },
    })

    user.value?.shelves.push(shelf)

    await navigateTo(`/shelves/${shelf.id}`)
  } catch (caught) {
    const message = (caught as { statusMessage?: string }).statusMessage

    error.value = message || 'Something went wrong. Try again.'
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <main>
    <PageHeader title="New shelf" />
    <p class="mt-3 max-w-md text-xs">
      A shelf keeps coffee apart, such as Home and Work. You can share it with
      other people later.
    </p>
    <form class="mt-8 flex max-w-md flex-col gap-4" @submit.prevent="create">
      <Field :data-invalid="error ? true : undefined">
        <FieldLabel for="shelf-name">Name</FieldLabel>
        <Input
          id="shelf-name"
          v-model="name"
          autocomplete="off"
          maxlength="40"
          required
          :aria-invalid="error ? true : undefined"
        />
        <FieldError v-if="error">{{ error }}</FieldError>
      </Field>
      <Button type="submit" class="self-start" :disabled="creating">
        Create shelf
      </Button>
    </form>
  </main>
</template>
