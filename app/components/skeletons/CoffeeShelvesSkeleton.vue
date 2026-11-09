<template>
  <section
    aria-hidden="true"
    class="mt-10"
    data-testid="coffee-shelves-skeleton"
  >
    <Skeleton class="h-7 w-40" />
    <div class="mt-4 flex flex-col gap-4 rounded-[18px] border p-4">
      <div v-for="row in 2" :key="row" class="flex flex-col gap-2">
        <Skeleton class="h-4 w-32" />
        <Skeleton class="h-3 w-24" />
      </div>
    </div>
  </section>
</template>
