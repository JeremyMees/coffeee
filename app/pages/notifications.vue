<script setup lang="ts">
import { useNotifications, useNotificationsRead } from '~/queries/notifications'

useHead({ title: 'Notifications · Coffeee' })

const { data, suspense } = useNotifications()
await suspense()

const { mutate: markRead } = useNotificationsRead()

const notifications = computed(() => data.value ?? [])

onMounted(() => {
  if (notifications.value.some(notification => !notification.readAt)) {
    markRead()
  }
})

function formatWhen(date: string) {
  return new Date(date).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}
</script>

<template>
  <main class="max-w-2xl">
    <PageHeader title="Notifications" hide-add />
    <p class="mt-3 text-xs">What happened on the shelves you share.</p>
    <p
      v-if="!notifications.length"
      class="mt-8 text-xs"
      data-testid="notifications-empty"
    >
      Nothing yet. When someone on your shelves adds a coffee, finishes a bag or
      joins, you see it here.
    </p>
    <ul v-else class="mt-8 divide-y rounded-[18px] border text-xs">
      <li v-for="notification in notifications" :key="notification.id">
        <NuxtLink
          :to="notificationLink(notification)"
          data-testid="notification"
          :data-unread="notification.readAt ? undefined : true"
          class="flex items-start gap-3 px-4 py-3 hover:bg-accent"
        >
          <span
            class="mt-1 size-2 shrink-0 rounded-full"
            :class="notification.readAt ? 'bg-transparent' : 'bg-destructive'"
            aria-hidden="true"
          />
          <span class="min-w-0">
            <span
              class="block font-sans font-semibold"
              data-testid="notification-text"
            >
              <span v-if="!notification.readAt" class="sr-only">New:</span>
              {{ notificationText(notification) }}
            </span>
            <span class="block">{{ formatWhen(notification.createdAt) }}</span>
          </span>
        </NuxtLink>
      </li>
    </ul>
  </main>
</template>
