<template>
  <div
    aria-hidden="true"
    class="flex flex-wrap items-center gap-2"
    data-testid="browsing-filters-skeleton"
  >
    <Skeleton
      v-for="(width, index) in ['w-28', 'w-20', 'w-24', 'w-24', 'w-24', 'w-28']"
      :key="index"
      :class="['h-8 rounded-full', width]"
    />
  </div>
</template>
