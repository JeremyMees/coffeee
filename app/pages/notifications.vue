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
      Nothing yet. When someone invites you to a shelf, or adds a coffee,
      finishes a bag or joins, you see it here.
    </p>
    <ul v-else class="mt-8 divide-y rounded-[18px] border text-xs">
      <li v-for="notification in notifications" :key="notification.id">
        <NotificationItem :notification="notification" />
      </li>
    </ul>
  </main>
</template>
