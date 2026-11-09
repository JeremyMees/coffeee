<template>
  <div
    aria-hidden="true"
    class="mt-8 flex flex-col"
    data-testid="library-table-skeleton"
  >
    <div class="flex gap-4 border-b border-primary py-3">
      <Skeleton class="h-3 w-24" />
      <Skeleton class="h-3 w-16" />
      <Skeleton class="h-3 w-20" />
      <Skeleton class="h-3 w-16" />
    </div>
    <div
      v-for="row in 5"
      :key="row"
      class="flex items-center gap-4 border-b py-4"
    >
      <Skeleton class="h-4 w-48" />
      <Skeleton class="h-3 w-16" />
      <Skeleton class="h-3 w-24" />
      <Skeleton class="h-3 w-20" />
    </div>
  </div>
</template>
