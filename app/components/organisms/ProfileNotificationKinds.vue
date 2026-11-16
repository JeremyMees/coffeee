<script setup lang="ts">
import { BellIcon, BellRingIcon } from '@lucide/vue'
import {
  useNotificationEmails,
  useNotificationEmailsUpdate,
  useNotificationPushes,
  useNotificationPushesUpdate,
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
const pushes = useNotificationPushes()
const { state: pushState, busy: pushBusy, turnOn } = usePush()

const { mutateAsync: updateEmails, isPending: savingEmails } =
  useNotificationEmailsUpdate()
const { mutateAsync: updatePushes, isPending: savingPushes } =
  useNotificationPushesUpdate()
const saveError = ref('')

const pushOffHere = computed(
  () => pushState.value !== 'checking' && pushState.value !== 'on',
)

async function turnOnHere() {
  saveError.value = ''

  try {
    await turnOn()
  } catch (caught) {
    console.error('Could not turn on push', caught)
    saveError.value = "Push couldn't be turned on. Try again."
  }
}

function isOptional(kind: NotificationKind): kind is OptionalEmailKind {
  return (optionalEmailKinds as readonly string[]).includes(kind)
}

function isEmailed(kind: NotificationKind) {
  return !isOptional(kind) || Boolean(emails.data.value?.emailed.includes(kind))
}

function isPushed(kind: NotificationKind) {
  return Boolean(pushes.data.value?.pushed.includes(kind))
}

function toggled<Kind>(chosen: Kind[], kind: Kind, on: boolean) {
  const others = chosen.filter(found => found !== kind)

  return on ? [...others, kind] : others
}

async function save(work: () => Promise<unknown>) {
  saveError.value = ''

  try {
    await work()
  } catch (caught) {
    saveError.value = serverErrors(caught).message
  }
}

function toggleEmail(kind: NotificationKind, on: boolean) {
  if (!isOptional(kind)) return

  return save(() =>
    updateEmails(toggled(emails.data.value?.emailed ?? [], kind, on)),
  )
}

function togglePush(kind: NotificationKind, on: boolean) {
  return save(() =>
    updatePushes(toggled(pushes.data.value?.pushed ?? [], kind, on)),
  )
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <div>
      <h2 class="text-[28px]">Email and push</h2>
      <p class="mt-1 text-xs">
        Notifications always show in the app. Choose which ones you also get by
        email or as a push. Invites are always emailed, and push choices apply
        to all your devices.
      </p>
    </div>
    <Notice
      v-if="pushOffHere"
      title="Push is off on this device"
      :icon="BellIcon"
      testid="notification-push-device-off"
    >
      Your choices below still apply to your other devices.
      <template v-if="pushState === 'off'" #action>
        <Button
          type="button"
          variant="quiet"
          size="sm"
          class="px-5"
          data-testid="notification-push-turn-on"
          :disabled="pushBusy"
          @click="turnOnHere"
        >
          <BellRingIcon aria-hidden="true" />
          Turn on push here
        </Button>
      </template>
    </Notice>
    <QuerySection :query="emails" testid="profile-notification-kinds">
      <table class="w-full border-separate border-spacing-0">
        <thead>
          <tr class="text-xs">
            <th scope="col" class="sr-only">Notification</th>
            <th scope="col" class="w-16 pb-2 font-normal">Email</th>
            <th scope="col" class="w-16 pb-2 font-normal">Push</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="{ kind, label } in kinds" :key="kind">
            <th
              scope="row"
              class="border-b py-3 text-left font-sans font-semibold"
            >
              {{ label }}
            </th>
            <td class="border-b py-3 text-center">
              <Switch
                :data-testid="`notification-email-${kind}`"
                :aria-label="`${label} by email`"
                :model-value="isEmailed(kind)"
                :disabled="!isOptional(kind) || savingEmails"
                @update:model-value="toggleEmail(kind, $event)"
              />
            </td>
            <td class="border-b py-3 text-center">
              <Skeleton
                v-if="!pushes.data.value"
                aria-hidden="true"
                :data-testid="`notification-push-${kind}-pending`"
                class="mx-auto h-5 w-9 rounded-full"
                :class="{ 'animate-none opacity-40': pushes.isError.value }"
              />
              <Switch
                v-else
                :data-testid="`notification-push-${kind}`"
                :aria-label="`${label} as push`"
                :model-value="isPushed(kind)"
                :disabled="savingPushes"
                @update:model-value="togglePush(kind, $event)"
              />
            </td>
          </tr>
        </tbody>
      </table>
      <template #skeleton><ProfileNotificationKindsSkeleton /></template>
    </QuerySection>
    <Alert
      v-if="pushes.isError.value"
      variant="destructive"
      data-testid="profile-notification-pushes-error"
    >
      <AlertDescription class="flex flex-col items-start gap-3">
        Your push choices couldn't be loaded. Email still works.
        <Button
          type="button"
          data-testid="profile-notification-pushes-retry"
          variant="quiet"
          size="sm"
          class="px-5"
          @click="pushes.refetch()"
        >
          Try again
        </Button>
      </AlertDescription>
    </Alert>
    <Alert
      v-if="saveError"
      variant="destructive"
      data-testid="notification-kinds-error"
    >
      <AlertDescription>{{ saveError }}</AlertDescription>
    </Alert>
  </section>
</template>
