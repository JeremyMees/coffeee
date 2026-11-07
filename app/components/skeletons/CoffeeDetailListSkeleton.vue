<template>
  <dl
    aria-hidden="true"
    class="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3"
    data-testid="coffee-details-skeleton"
  >
    <template v-for="row in 5" :key="row">
      <Skeleton class="h-3 w-20" />
      <Skeleton class="h-3 w-48 max-w-full" />
    </template>
  </dl>
</template>
