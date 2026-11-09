<template>
  <ul
    aria-hidden="true"
    class="divide-y rounded-[18px] border"
    data-testid="shelf-members-skeleton"
  >
    <li v-for="row in 2" :key="row" class="flex flex-col gap-2 px-4 py-3">
      <Skeleton class="h-4 w-28" />
      <Skeleton class="h-3 w-40" />
    </li>
  </ul>
</template>
