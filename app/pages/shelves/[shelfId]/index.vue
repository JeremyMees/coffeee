<script setup lang="ts">
import { useStock } from '~/queries/coffees'

useHead({ title: 'Stock · Coffeee' })

const route = useRoute('shelves-shelfId')
const shelfId = computed(() => idFrom(route.params.shelfId))
const shelf = useCurrentShelf()
const addCoffee = useAddCoffee()

const stock = useStock(shelfId)
</script>

<template>
  <main>
    <PageHeader title="Stock" />
    <QuerySection :query="stock" testid="stock">
      <template #default="{ data }">
        <div
          v-if="!data.length"
          class="mt-3 flex flex-col items-start gap-4"
          data-testid="stock-empty"
        >
          <p class="text-xs">
            Nothing in stock yet. Add the coffee you're drinking now.
          </p>
          <Button
            type="button"
            data-testid="stock-empty-add-coffee"
            variant="line"
            size="pill-lg"
            class="lg:hidden"
            @click="addCoffee = true"
          >
            + Add coffee
          </Button>
        </div>
        <ul
          v-else
          aria-label="Current stock"
          data-testid="stock"
          class="mt-8 grid gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3"
        >
          <li v-for="coffee in data" :key="coffee.id">
            <CoffeeCard
              :coffee="coffee"
              :to="shelfCoffeePath(shelf!, coffee)"
            />
          </li>
        </ul>
      </template>

      <template #skeleton><StockSkeleton /></template>
    </QuerySection>
  </main>
</template>
