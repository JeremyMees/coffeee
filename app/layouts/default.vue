<template>
  <div class="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
    <AppSidebar />
    <div
      class="pr-[env(safe-area-inset-right)] pb-[calc(7rem+env(safe-area-inset-bottom))] pl-[env(safe-area-inset-left)] lg:pb-16"
    >
      <div
        class="flex items-center border-b px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 text-[30px] lg:hidden"
      >
        <AppWordmark />
      </div>
      <div class="px-4 lg:px-10">
        <slot />
      </div>
    </div>
    <AppDock />
  </div>
</template>
