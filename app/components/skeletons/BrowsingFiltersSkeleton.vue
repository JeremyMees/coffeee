<template>
  <div aria-hidden="true" data-testid="browsing-filters-skeleton">
    <Skeleton class="h-11 w-28 rounded-full lg:hidden" />
    <div class="hidden flex-wrap items-center gap-2 lg:flex">
      <Skeleton
        v-for="(width, index) in [
          'w-28',
          'w-20',
          'w-24',
          'w-24',
          'w-24',
          'w-28',
        ]"
        :key="index"
        :class="['h-8 rounded-full', width]"
      />
    </div>
  </div>
</template>
