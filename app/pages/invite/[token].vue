<script setup lang="ts">
import { useInviteLink } from '~/queries/invites'

definePageMeta({ layout: false })

const route = useRoute('invite-token')
const user = useCurrentUser()
const token = String(route.params.token)
const signingIn = ref(false)
const answering = ref(false)
const answerError = ref('')

const link = useInviteLink(token)
const invite = computed(() => link.data.value?.invite)

watch(
  () => link.data.value?.user,
  signedIn => {
    if (signedIn) user.value ??= signedIn
  },
  { immediate: true },
)

const landing = computed(() =>
  invite.value?.shelfId
    ? shelfPath({ id: invite.value.shelfId, name: invite.value.shelf ?? '' })
    : '/',
)
const signInPath = `/sign-in?redirect=/invite/${token}`

async function acceptWithGoogle() {
  signingIn.value = true

  await authClient.signIn.social({
    provider: 'google',
    callbackURL: `/invite/${token}`,
    newUserCallbackURL: landing.value,
    errorCallbackURL: '/sign-in?error=invite',
    additionalData: { inviteToken: token },
  })
}

async function answer(choice: 'accept' | 'decline') {
  answering.value = true
  answerError.value = ''

  try {
    if (choice === 'decline') {
      await $fetch(`/api/invites/link/${token}/decline`, { method: 'POST' })

      return await navigateTo('/')
    }

    const shelf = await $fetch(`/api/invites/link/${token}/accept`, {
      method: 'POST',
    })

    if (!user.value?.shelves.some(found => found.id === shelf.id)) {
      user.value?.shelves.push(shelf)
    }

    await navigateTo(shelfPath(shelf))
  } catch (caught) {
    answerError.value = serverErrors(caught).message
  } finally {
    answering.value = false
  }
}

useHead({ title: 'Your invite · Coffeee' })
</script>

<template>
  <main class="flex min-h-dvh items-center justify-center p-6">
    <Card class="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          <h1 class="text-3xl font-bold" data-testid="invite-title">
            You're invited
          </h1>
        </CardTitle>
        <QuerySection :query="link" testid="invite">
          <template #default>
            <CardDescription data-testid="invite-description">
              <template v-if="!invite">
                This invite has expired or was already used. Ask for a new one.
              </template>
              <template v-else-if="invite.shelf">
                {{ invite.invitedBy }} invited you to their shelf
                <strong>{{ invite.shelf }}</strong
                >, to keep one stock of coffee together.
              </template>
              <template v-else>
                Join Coffeee to keep track of your coffee shelf. This link works
                once and expires seven days after it was made.
              </template>
            </CardDescription>
          </template>

          <template #skeleton><InviteSkeleton /></template>
        </QuerySection>
      </CardHeader>
      <template v-if="link.data.value">
        <CardContent v-if="!invite" class="flex flex-col gap-4">
          <NuxtLink
            to="/"
            class="text-center text-xs underline underline-offset-4"
            data-testid="invite-home"
          >
            Go to Coffeee
          </NuxtLink>
        </CardContent>
        <CardContent v-else-if="user" class="flex flex-col gap-4">
          <template v-if="invite.shelf">
            <Button
              size="lg"
              data-testid="invite-accept"
              :disabled="answering"
              @click="answer('accept')"
            >
              Join {{ invite.shelf }}
            </Button>
            <Button
              size="lg"
              variant="outline"
              data-testid="invite-decline"
              :disabled="answering"
              @click="answer('decline')"
            >
              Decline
            </Button>
            <Alert
              v-if="answerError"
              variant="destructive"
              data-testid="invite-error"
            >
              <AlertDescription>{{ answerError }}</AlertDescription>
            </Alert>
          </template>
          <template v-else>
            <p class="text-xs" data-testid="invite-signed-in">
              You already have an account.
            </p>
            <Button size="lg" as-child>
              <NuxtLink to="/">Go to your shelf</NuxtLink>
            </Button>
          </template>
        </CardContent>
        <CardContent v-else class="flex flex-col gap-4">
          <Button
            size="lg"
            class="w-full"
            data-testid="invite-google"
            :disabled="signingIn"
            @click="acceptWithGoogle"
          >
            Continue with Google
          </Button>
          <FieldSeparator>or</FieldSeparator>
          <PasswordSignUpForm :invite-token="token" :redirect="landing" />
          <p class="border-t pt-4 text-center text-xs">
            Already have an account?
            <NuxtLink
              :to="signInPath"
              class="underline underline-offset-4"
              data-testid="invite-sign-in"
            >
              Sign in to answer
            </NuxtLink>
          </p>
        </CardContent>
      </template>
    </Card>
  </main>
</template>
