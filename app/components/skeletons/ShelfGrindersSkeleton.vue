<template>
  <ul
    aria-hidden="true"
    class="divide-y rounded-[18px] border"
    data-testid="shelf-grinders-skeleton"
  >
    <li v-for="row in 2" :key="row" class="px-4 py-3">
      <Skeleton class="h-4 w-36" />
    </li>
  </ul>
</template>
