<template>
  <ul
    aria-hidden="true"
    class="divide-y"
    data-testid="profile-notification-kinds-skeleton"
  >
    <li
      v-for="row in 6"
      :key="row"
      class="flex items-center justify-between gap-4 py-3"
    >
      <Skeleton class="h-4 w-36" />
      <div class="flex gap-7">
        <Skeleton class="h-5 w-9 rounded-full" />
        <Skeleton class="h-5 w-9 rounded-full" />
      </div>
    </li>
  </ul>
</template>
