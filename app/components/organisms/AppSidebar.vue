<script setup lang="ts">
import { CookieIcon, ShieldIcon } from '@lucide/vue'

const destinations = useDestinations()
const user = useCurrentUser()

const links = computed(() =>
  user.value?.role === 'admin'
    ? [
        ...destinations.value,
        { label: 'Admin', to: '/admin', icon: ShieldIcon },
      ]
    : destinations.value,
)
</script>

<template>
  <aside
    data-testid="sidebar"
    class="sticky top-0 hidden h-dvh flex-col border-r [view-transition-name:sidebar] lg:flex"
  >
    <NuxtLink
      to="/"
      class="border-b px-6 pt-8 pb-6 text-[44px]"
      data-testid="sidebar-home"
    >
      <AppWordmark stacked aria-hidden="true" />
      <span class="sr-only">Coffeee</span>
    </NuxtLink>
    <nav
      aria-label="Sidebar"
      data-testid="sidebar-nav"
      class="flex flex-col gap-1 p-3 text-[13px]"
    >
      <NuxtLink
        v-for="item in links"
        :key="item.to"
        v-slot="{ href, navigate, isActive, isExactActive }"
        :to="item.to"
        custom
      >
        <a
          :href="href ?? undefined"
          :aria-current="isExactActive ? 'page' : undefined"
          data-testid="sidebar-link"
          class="flex items-center gap-3 rounded-full px-4 py-2.5 uppercase"
          :class="
            isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
          "
          @click="navigate"
        >
          <component :is="item.icon" class="size-4" aria-hidden="true" />
          {{ item.label }}
        </a>
      </NuxtLink>
    </nav>
    <div class="mt-auto flex flex-col gap-1 px-3 pb-3">
      <NotificationsLink labelled />
      <AppShortcuts />
      <ConsentDialogLink
        class="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-[13px] uppercase hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <CookieIcon class="size-4" aria-hidden="true" />
        Privacy settings
      </ConsentDialogLink>
    </div>
    <div class="border-t p-3">
      <ShelfSwitcher
        side="top"
        class="w-full"
        data-testid="sidebar-shelf-switcher"
      />
    </div>
  </aside>
</template>
