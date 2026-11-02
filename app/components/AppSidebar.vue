<script setup lang="ts">
const destinations = useDestinations()
</script>

<template>
  <aside
    class="sticky top-0 hidden h-dvh flex-col border-r [view-transition-name:sidebar] lg:flex"
  >
    <NuxtLink to="/" class="border-b px-6 pt-8 pb-6 text-[44px]">
      <AppWordmark stacked aria-hidden="true" />
      <span class="sr-only">Coffeee</span>
    </NuxtLink>
    <nav aria-label="Sidebar" class="flex flex-col gap-1 p-3 text-[13px]">
      <NuxtLink
        v-for="item in destinations"
        :key="item.to"
        v-slot="{ href, navigate, isActive, isExactActive }"
        :to="item.to"
        custom
      >
        <a
          :href="href ?? undefined"
          :aria-current="isExactActive ? 'page' : undefined"
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
    <div class="mt-auto border-t p-3">
      <ShelfSwitcher side="top" class="w-full" />
    </div>
  </aside>
</template>
