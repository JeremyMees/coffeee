<script setup lang="ts">
import { useForm } from 'vee-validate'

const props = defineProps<{ redirect: string }>()

const formError = ref('')
const unverified = ref(false)

const { handleSubmit, isSubmitting } = useForm({
  validationSchema: zodSchema(signInSchema),
  initialValues: { email: '', password: '' },
})

const signIn = handleSubmit(async body => {
  formError.value = ''
  unverified.value = false

  const { error } = await authClient.signIn.email({
    ...body,
    callbackURL: props.redirect,
  })

  if (!error) return navigateTo(props.redirect)

  if (error.code === 'EMAIL_NOT_VERIFIED') unverified.value = true
  else formError.value = authErrorMessage(error)
})
</script>

<template>
  <form
    class="flex flex-col gap-4"
    novalidate
    data-testid="sign-in-form"
    @submit="signIn"
  >
    <FieldGroup>
      <LabelledField
        v-slot="{ componentField, invalid }"
        name="email"
        label="Email"
        input-id="sign-in-email"
      >
        <Input
          id="sign-in-email"
          v-bind="componentField"
          data-testid="sign-in-email"
          type="email"
          autocomplete="email"
          :aria-invalid="invalid || undefined"
        />
      </LabelledField>
      <LabelledField
        v-slot="{ componentField, invalid }"
        name="password"
        label="Password"
        input-id="sign-in-password"
      >
        <Input
          id="sign-in-password"
          v-bind="componentField"
          data-testid="sign-in-password"
          type="password"
          autocomplete="current-password"
          :aria-invalid="invalid || undefined"
        />
      </LabelledField>
    </FieldGroup>
    <Alert v-if="unverified" data-testid="sign-in-unverified">
      <AlertTitle>Confirm your email first</AlertTitle>
      <AlertDescription>
        We've emailed you a new link. Open it to finish signing in.
      </AlertDescription>
    </Alert>
    <Alert
      v-if="formError"
      variant="destructive"
      data-testid="sign-in-form-error"
    >
      <AlertDescription>{{ formError }}</AlertDescription>
    </Alert>
    <Button
      type="submit"
      size="lg"
      variant="outline"
      data-testid="sign-in-submit"
      :disabled="isSubmitting"
    >
      Sign in with email
    </Button>
    <NuxtLink
      to="/forgot-password"
      class="text-center text-xs underline underline-offset-4"
      data-testid="sign-in-forgot"
    >
      Forgot your password?
    </NuxtLink>
  </form>
</template>
