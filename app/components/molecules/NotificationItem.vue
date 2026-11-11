<script setup lang="ts">
import { useMyInviteAccept, useMyInviteDecline } from '~/queries/invites'

const props = defineProps<{ notification: ShelfNotification }>()

const user = useCurrentUser()
const NuxtLink = resolveComponent('NuxtLink')
const { mutateAsync: accept, isPending: accepting } = useMyInviteAccept()
const { mutateAsync: decline, isPending: declining } = useMyInviteDecline()
const answerError = ref('')
const locale = useLocale()

const link = computed(() => notificationLink(props.notification))
const answerable = computed(
  () =>
    props.notification.kind === 'invited' &&
    props.notification.inviteStatus === 'pending',
)
const answered = computed(() => {
  if (props.notification.inviteStatus === 'accepted') return 'You joined'
  if (props.notification.inviteStatus === 'expired') return 'Invite expired'

  return ''
})

async function answer(choice: 'accept' | 'decline') {
  const inviteId = props.notification.inviteId!
  answerError.value = ''

  try {
    if (choice === 'decline') {
      await decline(inviteId)

      return
    }

    const shelf = await accept(inviteId)

    if (!user.value?.shelves.some(found => found.id === shelf.id)) {
      user.value?.shelves.push(shelf)
    }

    await navigateTo(shelfPath(shelf))
  } catch (caught) {
    answerError.value = serverErrors(caught).message
  }
}
</script>

<template>
  <article
    data-testid="notification"
    :data-unread="notification.readAt ? undefined : true"
    class="flex items-start gap-3 px-4 py-3"
  >
    <span
      class="mt-1 size-2 shrink-0 rounded-full"
      :class="notification.readAt ? 'bg-transparent' : 'bg-destructive'"
      aria-hidden="true"
    />
    <div class="flex min-w-0 flex-1 flex-col gap-2">
      <component
        :is="link ? NuxtLink : 'div'"
        :to="link ?? undefined"
        data-testid="notification-link"
        class="block"
        :class="{ 'hover:underline': link }"
      >
        <span
          class="block font-sans font-semibold"
          data-testid="notification-text"
        >
          <span v-if="!notification.readAt" class="sr-only">New:</span>
          {{ notificationText(notification) }}
        </span>
        <span class="block">{{
          formatDateTime(notification.createdAt, locale)
        }}</span>
      </component>
      <div
        v-if="answerable"
        class="flex gap-2"
        data-testid="notification-actions"
      >
        <Button
          type="button"
          data-testid="notification-decline"
          variant="outline"
          size="sm"
          :disabled="accepting || declining"
          @click="answer('decline')"
        >
          Decline
        </Button>
        <Button
          type="button"
          data-testid="notification-accept"
          size="sm"
          :disabled="accepting || declining"
          @click="answer('accept')"
        >
          Join {{ notification.shelf }}
        </Button>
      </div>
      <p
        v-else-if="answered"
        class="text-xs uppercase"
        data-testid="notification-answered"
      >
        {{ answered }}
      </p>
      <Alert
        v-if="answerError"
        variant="destructive"
        data-testid="notification-error"
      >
        <AlertDescription>{{ answerError }}</AlertDescription>
      </Alert>
    </div>
  </article>
</template>
