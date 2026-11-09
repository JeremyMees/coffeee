<template>
  <ul
    aria-hidden="true"
    class="mt-3 flex flex-col divide-y rounded-[18px] border"
    data-testid="invites-skeleton"
  >
    <li
      v-for="row in 3"
      :key="row"
      class="flex items-center justify-between gap-4 px-4 py-3"
    >
      <Skeleton class="h-4 w-48" />
      <Skeleton class="h-7 w-16 rounded-full" />
    </li>
  </ul>
</template>
