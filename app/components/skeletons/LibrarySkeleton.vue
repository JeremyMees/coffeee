<template>
  <ul
    aria-hidden="true"
    data-testid="library-skeleton"
    class="mt-8 flex flex-col lg:grid lg:grid-cols-2 lg:gap-5 2xl:grid-cols-3"
  >
    <li
      v-for="card in 3"
      :key="card"
      class="not-first:-mt-54 lg:not-first:mt-0"
    >
      <div
        class="flex flex-col overflow-hidden rounded-[28px] border border-primary bg-background"
      >
        <Skeleton class="h-44 shrink-0 rounded-none" />
        <div class="flex h-72 flex-col gap-3 border-t border-primary p-5">
          <Skeleton class="h-3 w-24" />
          <Skeleton class="h-8 w-3/4" />
          <div class="mt-2 flex gap-1.5">
            <Skeleton class="h-6 w-16 rounded-full" />
            <Skeleton class="h-6 w-20 rounded-full" />
          </div>
          <div class="mt-auto flex items-end justify-between">
            <Skeleton class="h-8 w-28" />
            <Skeleton class="h-12 w-16" />
          </div>
        </div>
      </div>
    </li>
  </ul>
</template>
