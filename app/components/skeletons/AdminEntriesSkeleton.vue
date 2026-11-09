<template>
  <div aria-hidden="true" class="mt-4" data-testid="admin-entries-skeleton">
    <div class="flex gap-4 border-b border-primary py-3">
      <Skeleton class="h-3 w-20" />
      <Skeleton class="h-3 w-12" />
    </div>
    <div
      v-for="row in 5"
      :key="row"
      class="flex items-center justify-between gap-4 border-b py-3"
    >
      <div class="flex flex-col gap-2">
        <Skeleton class="h-4 w-40" />
        <Skeleton class="h-3 w-24" />
      </div>
      <Skeleton class="h-7 w-48 rounded-full" />
    </div>
  </div>
</template>
