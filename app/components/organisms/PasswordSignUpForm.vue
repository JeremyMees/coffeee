<script setup lang="ts">
import { useForm } from 'vee-validate'

const props = withDefaults(
  defineProps<{ inviteToken?: string; redirect?: string }>(),
  { inviteToken: undefined, redirect: '/' },
)

const formError = ref('')
const sentTo = ref('')

const { handleSubmit, isSubmitting } = useForm({
  validationSchema: zodSchema(signUpSchema),
  initialValues: { name: '', email: '', password: '' },
})

const signUp = handleSubmit(async body => {
  formError.value = ''

  const { data, error } = await authClient.signUp.email({
    ...body,
    callbackURL: props.redirect,
    fetchOptions: {
      query: props.inviteToken ? { inviteToken: props.inviteToken } : {},
    },
  })

  if (error) {
    formError.value = authErrorMessage(error)
    return
  }

  if (!data.user.emailVerified) {
    sentTo.value = body.email
    return
  }

  const signedIn = await authClient.signIn.email({
    email: body.email,
    password: body.password,
  })

  if (signedIn.error) formError.value = authErrorMessage(signedIn.error)
  else await navigateTo(props.redirect)
})
</script>

<template>
  <Alert v-if="sentTo" data-testid="sign-up-sent">
    <AlertTitle>Check your inbox</AlertTitle>
    <AlertDescription>
      We've emailed a link to {{ sentTo }}. Open it to confirm your email and
      you're in.
    </AlertDescription>
  </Alert>
  <form
    v-else
    class="flex flex-col gap-4"
    novalidate
    data-testid="sign-up-form"
    @submit="signUp"
  >
    <FieldGroup>
      <LabelledField
        v-slot="{ componentField, invalid }"
        name="name"
        label="Name"
        input-id="sign-up-name"
      >
        <Input
          id="sign-up-name"
          v-bind="componentField"
          data-testid="sign-up-name"
          autocomplete="name"
          :aria-invalid="invalid || undefined"
        />
      </LabelledField>
      <LabelledField
        v-slot="{ componentField, invalid }"
        name="email"
        label="Email"
        input-id="sign-up-email"
      >
        <Input
          id="sign-up-email"
          v-bind="componentField"
          data-testid="sign-up-email"
          type="email"
          autocomplete="email"
          :aria-invalid="invalid || undefined"
        />
      </LabelledField>
      <LabelledField
        v-slot="{ componentField, invalid }"
        name="password"
        label="Password"
        input-id="sign-up-password"
      >
        <Input
          id="sign-up-password"
          v-bind="componentField"
          data-testid="sign-up-password"
          type="password"
          autocomplete="new-password"
          :aria-invalid="invalid || undefined"
        />
      </LabelledField>
    </FieldGroup>
    <Alert
      v-if="formError"
      variant="destructive"
      data-testid="sign-up-form-error"
    >
      <AlertDescription>{{ formError }}</AlertDescription>
    </Alert>
    <Button
      type="submit"
      variant="outline"
      data-testid="sign-up-submit"
      :disabled="isSubmitting"
    >
      Create account
    </Button>
  </form>
</template>
