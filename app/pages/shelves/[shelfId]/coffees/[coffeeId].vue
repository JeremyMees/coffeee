<script setup lang="ts">
import { ArrowLeftIcon } from '@lucide/vue'

const route = useRoute('shelves-shelfId-coffees-coffeeId')
const shelfId = computed(() => route.params.shelfId)
const coffeeId = computed(() => route.params.coffeeId)

const { data: coffee, error } = await useFetch(
  () => `/api/shelves/${shelfId.value}/coffees/${coffeeId.value}`,
)

if (error.value || !coffee.value) {
  showError({ statusCode: 404, statusMessage: 'Coffee not found' })
}

useHead({ title: () => `${coffee.value?.name} · Coffeee` })

const latestRoastedOn = computed(
  () =>
    coffee.value?.purchases.find(purchase => purchase.roastedOn)?.roastedOn ??
    null,
)

const euros = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'EUR',
})

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
</script>

<template>
  <main v-if="coffee" class="max-w-2xl">
    <NuxtLink
      :to="`/shelves/${shelfId}`"
      class="mt-6 inline-flex items-center gap-2 text-xs uppercase lg:mt-10"
    >
      <ArrowLeftIcon class="size-4" aria-hidden="true" />
      Stock
    </NuxtLink>
    <header class="mt-4">
      <p class="text-xs uppercase">{{ coffee.roaster }}</p>
      <h1 class="mt-2 text-[48px] lg:text-[72px]">{{ coffee.name }}</h1>
    </header>
    <CoffeeCard
      class="mt-8"
      :coffee="{ ...coffee, roastedOn: latestRoastedOn }"
    />
    <section class="mt-10">
      <h2 class="text-[28px]">Bags on this shelf</h2>
      <p v-if="!coffee.purchases.length" class="mt-3 text-xs">
        Nobody on this shelf has bought it yet.
      </p>
      <ul v-else class="mt-4 divide-y rounded-[18px] border">
        <li
          v-for="purchase in coffee.purchases"
          :key="purchase.id"
          class="grid grid-cols-2 gap-x-4 gap-y-1 p-4 text-xs sm:grid-cols-4"
        >
          <span>Bought {{ formatDate(purchase.purchasedOn) }}</span>
          <span>
            {{
              purchase.roastedOn
                ? `Roasted ${formatDate(purchase.roastedOn)}`
                : 'No roast date'
            }}
          </span>
          <span>
            {{
              purchase.sizeGrams ? `${purchase.sizeGrams} g` : 'Size unknown'
            }}
            ·
            {{
              purchase.priceCents === null
                ? 'Price unknown'
                : euros.format(purchase.priceCents / 100)
            }}
          </span>
          <span class="uppercase sm:text-right">
            {{ purchase.finishedAt ? 'Finished' : 'In stock' }}
          </span>
        </li>
      </ul>
    </section>
  </main>
</template>
