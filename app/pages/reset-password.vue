<script setup lang="ts">
import { useForm } from 'vee-validate'

definePageMeta({ layout: false })

const route = useRoute()
const formError = ref('')

const token = computed(() =>
  typeof route.query.token === 'string' ? route.query.token : '',
)

const { handleSubmit, isSubmitting } = useForm({
  validationSchema: zodSchema(newPasswordSchema),
  initialValues: { password: '' },
})

const resetPassword = handleSubmit(async ({ password }) => {
  formError.value = ''

  const { error } = await authClient.resetPassword({
    newPassword: password,
    token: token.value,
  })

  if (error) formError.value = authErrorMessage(error)
  else await navigateTo({ path: '/sign-in', query: { reset: 'done' } })
})

useHead({ title: 'Pick a new password · Coffeee' })
</script>

<template>
  <main class="flex min-h-dvh items-center justify-center p-6">
    <Card class="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          <h1 class="text-3xl font-bold" data-testid="reset-title">
            Pick a new password
          </h1>
        </CardTitle>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <Alert v-if="!token" variant="destructive" data-testid="reset-expired">
          <AlertTitle>This link doesn't work anymore</AlertTitle>
          <AlertDescription>
            It expired or was already used.
            <NuxtLink
              to="/forgot-password"
              class="hit-area underline underline-offset-4"
            >
              Ask for a new one
            </NuxtLink>
          </AlertDescription>
        </Alert>
        <form
          v-else
          class="flex flex-col gap-4"
          novalidate
          data-testid="reset-form"
          @submit="resetPassword"
        >
          <FieldGroup>
            <LabelledField
              v-slot="{ componentField, invalid }"
              name="password"
              label="New password"
              input-id="reset-password"
            >
              <Input
                id="reset-password"
                v-bind="componentField"
                data-testid="reset-password"
                type="password"
                autocomplete="new-password"
                :aria-invalid="invalid || undefined"
              />
            </LabelledField>
          </FieldGroup>
          <Alert
            v-if="formError"
            variant="destructive"
            data-testid="reset-form-error"
          >
            <AlertDescription>{{ formError }}</AlertDescription>
          </Alert>
          <Button
            type="submit"
            size="lg"
            data-testid="reset-submit"
            :disabled="isSubmitting"
          >
            Save password
          </Button>
        </form>
      </CardContent>
    </Card>
  </main>
</template>
