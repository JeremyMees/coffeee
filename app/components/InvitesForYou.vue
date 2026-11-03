<script setup lang="ts">
import {
  useMyInviteAccept,
  useMyInviteDecline,
  useMyInvites,
} from '~/queries/invites'

const user = useCurrentUser()
const { data } = useMyInvites()
const { mutateAsync: accept, isPending: accepting } = useMyInviteAccept()
const { mutateAsync: decline, isPending: declining } = useMyInviteDecline()
const answerError = ref('')

const invites = computed(() => data.value ?? [])

async function join(inviteId: string) {
  answerError.value = ''

  try {
    const shelf = await accept(inviteId)

    user.value?.shelves.push(shelf)

    await navigateTo(`/shelves/${shelf.id}`)
  } catch (caught) {
    answerError.value = serverErrors(caught).message
  }
}

async function refuse(inviteId: string) {
  answerError.value = ''

  try {
    await decline(inviteId)
  } catch (caught) {
    answerError.value = serverErrors(caught).message
  }
}
</script>

<template>
  <section
    v-if="invites.length"
    class="mt-6 flex flex-col gap-3 lg:mt-10"
    data-testid="invites-for-you"
  >
    <article
      v-for="invite in invites"
      :key="invite.id"
      data-testid="invite-for-you"
      class="flex flex-col gap-3 rounded-[18px] border p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p class="text-xs">
        <strong class="font-sans font-semibold">{{ invite.invitedBy }}</strong>
        invited you to
        <strong class="font-sans font-semibold">{{ invite.shelf }}</strong>
      </p>
      <div class="flex gap-2">
        <button
          type="button"
          data-testid="invite-for-you-decline"
          class="rounded-full border border-primary px-4 py-2 text-xs uppercase transition-colors hover:bg-accent disabled:opacity-60"
          :disabled="accepting || declining"
          @click="refuse(invite.id)"
        >
          Decline
        </button>
        <button
          type="button"
          data-testid="invite-for-you-accept"
          class="rounded-full bg-primary px-4 py-2 text-xs text-primary-foreground uppercase disabled:opacity-60"
          :disabled="accepting || declining"
          @click="join(invite.id)"
        >
          Join shelf
        </button>
      </div>
    </article>
    <Alert
      v-if="answerError"
      variant="destructive"
      data-testid="invite-for-you-error"
    >
      <AlertDescription>{{ answerError }}</AlertDescription>
    </Alert>
  </section>
</template>
