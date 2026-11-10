<template>
  <ul
    aria-hidden="true"
    class="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3"
    data-testid="roaster-coffees-skeleton"
  >
    <li
      v-for="row in 3"
      :key="row"
      class="flex gap-4 rounded-[18px] border p-3"
    >
      <Skeleton class="size-16 shrink-0 rounded-[12px]" />
      <div class="flex flex-col gap-2 pt-1">
        <Skeleton class="h-4 w-40" />
        <Skeleton class="h-3 w-24" />
      </div>
    </li>
  </ul>
</template>
