<template>
  <ul
    aria-hidden="true"
    class="mt-8 divide-y rounded-[18px] border"
    data-testid="notifications-skeleton"
  >
    <li v-for="row in 4" :key="row" class="flex items-start gap-3 px-4 py-3">
      <Skeleton class="mt-1 size-2 shrink-0 rounded-full" />
      <div class="flex flex-1 flex-col gap-2">
        <Skeleton class="h-4 w-3/4" />
        <Skeleton class="h-3 w-20" />
      </div>
    </li>
  </ul>
</template>
