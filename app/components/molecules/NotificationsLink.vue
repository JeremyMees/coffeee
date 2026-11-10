<script setup lang="ts">
import { BellIcon } from '@lucide/vue'
import { useUnreadNotifications } from '~/queries/notifications'

defineProps<{ labelled?: boolean }>()

const { data } = useUnreadNotifications()

const unread = computed(() => data.value?.unread ?? 0)
const label = computed(() =>
  unread.value > 0 ? `Notifications, ${unread.value} unread` : 'Notifications',
)
</script>

<template>
  <NuxtLink v-slot="{ href, navigate, isActive }" to="/notifications" custom>
    <a
      :href="href ?? undefined"
      :aria-label="labelled ? undefined : label"
      :aria-current="isActive ? 'page' : undefined"
      :title="labelled ? undefined : label"
      data-testid="notifications-link"
      class="relative flex items-center gap-3 rounded-full uppercase"
      :class="[
        labelled ? 'px-4 py-3.5 text-[13px] lg:py-2.5' : 'p-3 lg:p-2',
        isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
      ]"
      @click="navigate"
    >
      <BellIcon :class="labelled ? 'size-4' : 'size-5'" aria-hidden="true" />
      <template v-if="labelled">Notifications</template>
      <span
        v-if="unread > 0"
        data-testid="notifications-unread"
        :aria-hidden="labelled ? undefined : 'true'"
        class="grid min-w-5 place-items-center rounded-full bg-destructive px-1.5 text-[10px] leading-5 text-white"
        :class="labelled ? 'ml-auto' : 'absolute -top-0.5 -right-0.5'"
      >
        <span v-if="labelled" class="sr-only">Unread: </span>
        {{ unread > 99 ? '99+' : unread }}
      </span>
    </a>
  </NuxtLink>
</template>
