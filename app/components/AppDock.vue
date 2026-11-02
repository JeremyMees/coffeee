<script setup lang="ts">
import { PlusIcon } from '@lucide/vue'
</script>

<template>
  <nav
    aria-label="Dock"
    class="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] [view-transition-name:dock] lg:hidden"
  >
    <Dock
      class="mt-0 h-auto gap-1 rounded-full border-primary bg-material p-1.5"
      :magnification="20"
      :distance="80"
    >
      <DockIcon v-for="item in destinations" :key="item.to">
        <NuxtLink
          v-slot="{ href, navigate, isActive, isExactActive }"
          :to="item.to"
          custom
        >
          <a
            :href="href ?? undefined"
            :aria-label="item.label"
            :title="item.label"
            :aria-current="isExactActive ? 'page' : undefined"
            class="grid size-full place-items-center rounded-full"
            :class="{ 'bg-primary text-primary-foreground': isActive }"
            @click="navigate"
          >
            <component :is="item.icon" class="size-5" aria-hidden="true" />
          </a>
        </NuxtLink>
      </DockIcon>
      <DockSeparator class="mx-1 h-7 w-px bg-border" />
      <DockIcon>
        <button
          type="button"
          aria-label="Add coffee"
          title="Add coffee"
          class="grid size-full place-items-center rounded-full border border-primary"
        >
          <PlusIcon class="size-5" aria-hidden="true" />
        </button>
      </DockIcon>
    </Dock>
  </nav>
</template>
