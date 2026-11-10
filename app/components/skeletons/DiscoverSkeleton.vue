<template>
  <div aria-hidden="true" class="mt-8" data-testid="discover-skeleton">
    <Skeleton class="h-3 w-20" />
    <ul class="mt-3 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
      <li
        v-for="row in 4"
        :key="row"
        class="flex gap-4 rounded-[18px] border p-3"
      >
        <Skeleton class="size-16 shrink-0 rounded-[12px]" />
        <div class="flex flex-col gap-2 pt-1">
          <Skeleton class="h-3 w-20" />
          <Skeleton class="h-4 w-40" />
          <Skeleton class="h-3 w-32" />
        </div>
      </li>
    </ul>
  </div>
</template>
