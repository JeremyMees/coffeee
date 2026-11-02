<script setup lang="ts">
const route = useRoute()
const signingIn = ref(false)

const refused = computed(() => typeof route.query.error === 'string')

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
          <h1 class="text-3xl font-bold">Coffeee</h1>
        </CardTitle>
        <CardDescription>
          Your coffee shelf, and every coffee you ever bought.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <Alert v-if="refused" variant="destructive">
          <AlertTitle>Coffeee is invite-only</AlertTitle>
          <AlertDescription>
            Ask an admin to invite you, or open the invite link you were sent.
          </AlertDescription>
        </Alert>
        <Button size="lg" :disabled="signingIn" @click="continueWithGoogle">
          Continue with Google
        </Button>
      </CardContent>
    </Card>
  </main>
</template>
