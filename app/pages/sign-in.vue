<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const signingIn = ref(false)

const refused = computed(() => typeof route.query.error === 'string')
const reset = computed(() => route.query.reset === 'done')

function redirectPath() {
  const redirect = route.query.redirect

  return typeof redirect === 'string' && /^\/(?![/\\])/.test(redirect)
    ? redirect
    : '/'
}

async function continueWithGoogle() {
  signingIn.value = true

  await authClient.signIn.social({
    provider: 'google',
    callbackURL: redirectPath(),
    errorCallbackURL: '/sign-in?error=invite',
  })
}

useHead({ title: 'Sign in · Coffeee' })
</script>

<template>
  <main class="flex min-h-dvh items-center justify-center p-6">
    <Card class="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          <h1 class="text-3xl font-bold" data-testid="sign-in-title">
            Coffeee
          </h1>
        </CardTitle>
        <CardDescription>
          Your coffee shelf, and every coffee you ever bought.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <Alert
          v-if="refused"
          variant="destructive"
          data-testid="sign-in-refused"
        >
          <AlertTitle>Coffeee is invite-only</AlertTitle>
          <AlertDescription>
            Ask an admin to invite you, or open the invite link you were sent.
          </AlertDescription>
        </Alert>
        <Alert v-if="reset" data-testid="sign-in-reset">
          <AlertTitle>Password changed</AlertTitle>
          <AlertDescription>Sign in with your new password.</AlertDescription>
        </Alert>
        <Button
          size="lg"
          data-testid="sign-in-google"
          :disabled="signingIn"
          @click="continueWithGoogle"
        >
          Continue with Google
        </Button>
        <FieldSeparator>or</FieldSeparator>
        <PasswordSignInForm :redirect="redirectPath()" />
        <p class="border-t pt-4 text-center text-xs">
          Invited by email?
          <NuxtLink
            to="/sign-up"
            class="underline underline-offset-4"
            data-testid="sign-in-sign-up"
          >
            Create an account
          </NuxtLink>
        </p>
      </CardContent>
    </Card>
  </main>
</template>
