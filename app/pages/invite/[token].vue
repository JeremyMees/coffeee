<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute('invite-token')
const signingIn = ref(false)

async function acceptWithGoogle() {
  signingIn.value = true

  await authClient.signIn.social({
    provider: 'google',
    callbackURL: '/',
    errorCallbackURL: '/sign-in?error=invite',
    additionalData: { inviteToken: String(route.params.token) },
  })
}

useHead({ title: 'Your invite · Coffeee' })
</script>

<template>
  <main class="flex min-h-dvh items-center justify-center p-6">
    <Card class="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          <h1 class="text-3xl font-bold">You're invited</h1>
        </CardTitle>
        <CardDescription>
          Join Coffeee to keep track of your coffee shelf. This link works once
          and expires seven days after it was made.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          size="lg"
          class="w-full"
          :disabled="signingIn"
          @click="acceptWithGoogle"
        >
          Continue with Google
        </Button>
      </CardContent>
    </Card>
  </main>
</template>
