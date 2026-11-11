<template>
  <div aria-hidden="true" class="mt-8" data-testid="discover-skeleton">
    <Skeleton class="h-3 w-20" />
    <ul class="mt-3 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
      <li v-for="card in 4" :key="card">
        <CoffeeSpecCardSkeleton />
      </li>
    </ul>
  </div>
</template>
