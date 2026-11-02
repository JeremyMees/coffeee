<script setup lang="ts">
useHead({ title: 'Stock · Coffeee' })

const route = useRoute('shelves-shelfId')
const shelfId = computed(() => route.params.shelfId)
const addCoffee = useAddCoffee()

const { data: stock } = await useFetch(
  () => `/api/shelves/${shelfId.value}/stock`,
  { key: () => `stock:${shelfId.value}`, default: () => [] },
)
</script>

<template>
  <main>
    <PageHeader title="Stock" />
    <div
      v-if="!stock.length"
      class="mt-3 flex flex-col items-start gap-4"
      data-testid="stock-empty"
    >
      <p class="text-xs">
        Nothing in stock yet. Add the coffee you're drinking now.
      </p>
      <button
        type="button"
        data-testid="stock-empty-add-coffee"
        class="rounded-full border border-primary px-6 py-2.5 text-sm uppercase lg:hidden"
        @click="addCoffee = true"
      >
        + Add coffee
      </button>
    </div>
    <ul
      v-else
      aria-label="Current stock"
      data-testid="stock"
      class="mt-8 flex flex-col lg:grid lg:grid-cols-2 lg:gap-5 2xl:grid-cols-3"
    >
      <li
        v-for="coffee in stock"
        :key="coffee.id"
        class="not-first:-mt-[216px] lg:not-first:mt-0"
      >
        <CoffeeCard
          :coffee="coffee"
          :to="`/shelves/${shelfId}/coffees/${coffee.id}`"
        />
      </li>
    </ul>
  </main>
</template>
