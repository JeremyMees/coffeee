<script setup lang="ts">
import { useForm } from 'vee-validate'

definePageMeta({ layout: false })

const sentTo = ref('')
const formError = ref('')

const { handleSubmit, isSubmitting } = useForm({
  validationSchema: zodSchema(inviteEmailSchema),
  initialValues: { email: '' },
})

const sendLink = handleSubmit(async ({ email }) => {
  formError.value = ''

  const { error } = await authClient.requestPasswordReset({
    email,
    redirectTo: '/reset-password',
  })

  if (error) formError.value = authErrorMessage(error)
  else sentTo.value = email
})

useHead({ title: 'Forgot your password · Coffeee' })
</script>

<template>
  <main class="flex min-h-dvh items-center justify-center p-6">
    <Card class="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          <h1 class="text-3xl font-bold" data-testid="forgot-title">
            Forgot your password?
          </h1>
        </CardTitle>
        <CardDescription>
          We'll email you a link to pick a new one.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <Alert v-if="sentTo" data-testid="forgot-sent">
          <AlertTitle>Check your inbox</AlertTitle>
          <AlertDescription>
            If {{ sentTo }} has a Coffeee account, a link to reset its password
            is on its way. It works for one hour.
          </AlertDescription>
        </Alert>
        <form
          v-else
          class="flex flex-col gap-4"
          novalidate
          data-testid="forgot-form"
          @submit="sendLink"
        >
          <FieldGroup>
            <LabelledField
              v-slot="{ componentField, invalid }"
              name="email"
              label="Email"
              input-id="forgot-email"
            >
              <Input
                id="forgot-email"
                v-bind="componentField"
                data-testid="forgot-email"
                type="email"
                autocomplete="email"
                :aria-invalid="invalid || undefined"
              />
            </LabelledField>
          </FieldGroup>
          <Alert
            v-if="formError"
            variant="destructive"
            data-testid="forgot-form-error"
          >
            <AlertDescription>{{ formError }}</AlertDescription>
          </Alert>
          <Button
            type="submit"
            size="lg"
            data-testid="forgot-submit"
            :disabled="isSubmitting"
          >
            Email me a link
          </Button>
        </form>
        <NuxtLink
          to="/sign-in"
          class="text-center text-xs underline underline-offset-4"
          data-testid="forgot-sign-in"
        >
          Back to sign in
        </NuxtLink>
      </CardContent>
    </Card>
  </main>
</template>
