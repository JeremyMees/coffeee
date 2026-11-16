<template>
  <div aria-hidden="true" class="mt-8" data-testid="library-skeleton">
    <Skeleton class="h-3 w-20" />
    <ul class="mt-3 grid gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
      <li v-for="card in 3" :key="card">
        <CoffeeSpecCardSkeleton :rows="5" />
      </li>
    </ul>
  </div>
</template>
