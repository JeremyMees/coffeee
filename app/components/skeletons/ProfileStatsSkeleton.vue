<template>
  <div
    aria-hidden="true"
    class="grid grid-cols-2 gap-px overflow-hidden rounded-[18px] border bg-border"
    data-testid="profile-stats-skeleton"
  >
    <div
      v-for="cell in 7"
      :key="cell"
      class="flex flex-col gap-2 bg-background p-4 last:col-span-2"
    >
      <Skeleton class="h-3 w-20" />
      <Skeleton class="h-4 w-12" />
    </div>
  </div>
</template>
