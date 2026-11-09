<template>
  <ul
    aria-hidden="true"
    class="divide-y rounded-[18px] border"
    data-testid="profile-notification-emails-skeleton"
  >
    <li
      v-for="row in 6"
      :key="row"
      class="flex items-center justify-between gap-4 px-4 py-3"
    >
      <Skeleton class="h-4 w-36" />
      <Skeleton class="h-5 w-9 rounded-full" />
    </li>
  </ul>
</template>
