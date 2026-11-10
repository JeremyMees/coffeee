<template>
  <ul
    aria-hidden="true"
    data-testid="stock-skeleton"
    class="mt-8 grid gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3"
  >
    <li v-for="card in 3" :key="card">
      <div
        class="flex flex-col gap-2.5 rounded-[18px] border border-primary px-3.5 py-3"
      >
        <div class="flex items-center gap-3">
          <Skeleton class="size-13 shrink-0 rounded-[10px]" />
          <div class="flex flex-1 flex-col gap-2">
            <Skeleton class="h-3 w-20" />
            <Skeleton class="h-5 w-3/4" />
          </div>
        </div>
        <div class="flex flex-col gap-2 border-t border-primary pt-2.5">
          <Skeleton v-for="row in 4" :key="row" class="h-3 w-full" />
        </div>
      </div>
    </li>
  </ul>
</template>
