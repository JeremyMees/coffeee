<template>
  <ul
    aria-hidden="true"
    data-testid="stock-skeleton"
    class="mt-8 grid gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3"
  >
    <li v-for="card in 3" :key="card">
      <CoffeeSpecCardSkeleton />
    </li>
  </ul>
</template>
