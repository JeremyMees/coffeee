<template>
  <ul
    aria-hidden="true"
    class="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3"
    data-testid="roaster-coffees-skeleton"
  >
    <li v-for="card in 3" :key="card">
      <CoffeeSpecCardSkeleton :roaster="false" />
    </li>
  </ul>
</template>
