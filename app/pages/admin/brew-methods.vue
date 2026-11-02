<script setup lang="ts">
import { useForm } from 'vee-validate'
import { useBrewMethodCreate, useBrewMethods } from '~/queries/brew-methods'

definePageMeta({ middleware: 'admin' })

useHead({ title: 'Brew methods · Coffeee' })

const { data, suspense } = useBrewMethods()
await suspense()
const brewMethods = computed(() => data.value ?? [])
const { mutateAsync: createBrewMethod } = useBrewMethodCreate()

const formError = ref('')

const { handleSubmit, resetForm, setErrors, isSubmitting } = useForm({
  validationSchema: zodSchema(newBrewMethodSchema),
  initialValues: { name: '' },
})

const add = handleSubmit(async brewMethod => {
  formError.value = ''

  try {
    await createBrewMethod(brewMethod)

    resetForm()
  } catch (error) {
    const { fields, message } = serverErrors(error)

    setErrors(fields)
    formError.value = message
  }
})
</script>

<template>
  <main class="mx-auto flex max-w-xl flex-col gap-6 px-6 py-10">
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-3xl font-bold" data-testid="brew-methods-title">
        Brew methods
      </h1>
      <Button variant="ghost" as-child>
        <NuxtLink to="/profile">Done</NuxtLink>
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Add a brew method</CardTitle>
        <CardDescription>
          Every shelf can keep grind settings for it. Only admins can extend
          this list.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          class="flex flex-col gap-3"
          novalidate
          data-testid="brew-method-form"
          @submit="add"
        >
          <FieldGroup>
            <LabelledField
              v-slot="{ componentField, invalid }"
              name="name"
              label="Name"
              input-id="brew-method-name"
            >
              <Input
                id="brew-method-name"
                v-bind="componentField"
                data-testid="brew-method-name"
                autocomplete="off"
                :aria-invalid="invalid || undefined"
              />
            </LabelledField>
          </FieldGroup>
          <Alert
            v-if="formError"
            variant="destructive"
            data-testid="form-error"
          >
            <AlertDescription>{{ formError }}</AlertDescription>
          </Alert>
          <Button
            type="submit"
            data-testid="brew-method-submit"
            :disabled="isSubmitting"
          >
            Add brew method
          </Button>
        </form>
      </CardContent>
    </Card>

    <ul
      class="flex flex-col divide-y rounded-lg border"
      data-testid="brew-methods"
    >
      <li
        v-for="brewMethod in brewMethods"
        :key="brewMethod.id"
        data-testid="brew-method"
        class="px-4 py-3"
      >
        {{ brewMethod.name }}
      </li>
    </ul>
  </main>
</template>
