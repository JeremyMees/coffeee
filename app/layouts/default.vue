<script setup lang="ts">
useSearchShortcut()
useAddCoffeeShortcut()

const addRoaster = useAddRoaster()
</script>

<template>
  <div class="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
    <AppSidebar />
    <div
      class="pr-[env(safe-area-inset-right)] pb-[calc(7rem+env(safe-area-inset-bottom))] pl-[env(safe-area-inset-left)] lg:pb-16"
    >
      <header
        data-testid="top-bar"
        class="flex items-center justify-between gap-3 border-b px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 lg:hidden"
      >
        <span class="text-[30px]"><AppWordmark /></span>
        <span class="flex max-w-[65%] min-w-0 items-center gap-2">
          <NotificationsLink />
          <ShelfSwitcher
            align="end"
            class="min-w-0"
            data-testid="top-bar-shelf-switcher"
          />
        </span>
      </header>
      <div class="px-4 lg:px-10">
        <slot />
      </div>
    </div>
    <AppDock />
    <AddCoffeeSheet />
    <LazyAddRoasterSheet v-model:open="addRoaster" />
  </div>
</template>
