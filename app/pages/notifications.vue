<script setup lang="ts">
import { useNotifications, useNotificationsRead } from '~/queries/notifications'

useHead({ title: 'Notifications · Coffeee' })

const notifications = useNotifications()
const { mutate: markRead } = useNotificationsRead()

watch(
  notifications.data,
  listed => {
    if (listed?.some(notification => !notification.readAt)) markRead()
  },
  { immediate: true },
)
</script>

<template>
  <main class="max-w-2xl">
    <PageHeader title="Notifications" hide-add />
    <p class="mt-3 text-xs">What happened on the shelves you share.</p>
    <QuerySection :query="notifications" testid="notifications">
      <template #default="{ data }">
        <p
          v-if="!data.length"
          class="mt-8 text-xs"
          data-testid="notifications-empty"
        >
          Nothing yet. When someone invites you to a shelf, or adds a coffee,
          finishes a bag or joins, you see it here.
        </p>
        <ul
          v-else
          class="mt-8 divide-y rounded-[18px] border text-xs"
          data-testid="notifications"
        >
          <li v-for="notification in data" :key="notification.id">
            <NotificationItem :notification="notification" />
          </li>
        </ul>
      </template>

      <template #skeleton><NotificationsSkeleton /></template>
    </QuerySection>
  </main>
</template>
