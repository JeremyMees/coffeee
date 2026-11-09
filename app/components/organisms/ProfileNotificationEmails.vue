<script setup lang="ts">
import {
  useNotificationEmails,
  useNotificationEmailsUpdate,
} from '~/queries/notifications'

const kinds: { kind: NotificationKind; label: string }[] = [
  { kind: 'invited', label: 'Invites to a shelf' },
  { kind: 'coffeeAdded', label: 'Coffees added' },
  { kind: 'purchaseAdded', label: 'Bags added' },
  { kind: 'bagFinished', label: 'Bags finished' },
  { kind: 'memberJoined', label: 'Members joining' },
  { kind: 'memberLeft', label: 'Members leaving' },
]

const emails = useNotificationEmails()
const { data } = emails

const { mutateAsync: update, isPending } = useNotificationEmailsUpdate()
const saveError = ref('')

function isOptional(kind: NotificationKind): kind is OptionalEmailKind {
  return (optionalEmailKinds as readonly string[]).includes(kind)
}

function isEmailed(kind: NotificationKind) {
  return !isOptional(kind) || Boolean(data.value?.emailed.includes(kind))
}

async function toggle(kind: NotificationKind, on: boolean) {
  if (!isOptional(kind)) return

  const emailed = (data.value?.emailed ?? []).filter(found => found !== kind)
  saveError.value = ''

  try {
    await update(on ? [...emailed, kind] : emailed)
  } catch (caught) {
    saveError.value = serverErrors(caught).message
  }
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <div>
      <h2 class="text-[28px]">Email</h2>
      <p class="mt-1 text-xs">
        Notifications always show in the app. Choose which ones you also get by
        email. Invites are always emailed.
      </p>
    </div>
    <QuerySection :query="emails" testid="profile-notification-emails">
      <ul class="divide-y rounded-[18px] border">
        <li
          v-for="{ kind, label } in kinds"
          :key="kind"
          class="flex items-center justify-between gap-4 px-4 py-3"
        >
          <label
            :for="`notification-email-${kind}`"
            class="font-sans font-semibold"
          >
            {{ label }}
          </label>
          <Switch
            :id="`notification-email-${kind}`"
            :data-testid="`notification-email-${kind}`"
            :model-value="isEmailed(kind)"
            :disabled="!isOptional(kind) || isPending"
            @update:model-value="toggle(kind, $event)"
          />
        </li>
      </ul>
      <template #skeleton><ProfileNotificationEmailsSkeleton /></template>
    </QuerySection>
    <Alert
      v-if="saveError"
      variant="destructive"
      data-testid="notification-email-error"
    >
      <AlertDescription>{{ saveError }}</AlertDescription>
    </Alert>
  </section>
</template>
