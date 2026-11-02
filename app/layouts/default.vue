<template>
  <div class="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
    <AppSidebar />
    <div
      class="pr-[env(safe-area-inset-right)] pb-[calc(7rem+env(safe-area-inset-bottom))] pl-[env(safe-area-inset-left)] lg:pb-16"
    >
      <header
        data-testid="top-bar"
        class="flex items-center justify-between gap-3 border-b px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 lg:hidden"
      >
        <span class="text-[30px]"><AppWordmark /></span>
        <ShelfSwitcher
          align="end"
          class="max-w-[55%]"
          data-testid="top-bar-shelf-switcher"
        />
      </header>
      <div class="px-4 lg:px-10">
        <slot />
      </div>
    </div>
    <AppDock />
    <AddCoffeeSheet />
  </div>
</template>
