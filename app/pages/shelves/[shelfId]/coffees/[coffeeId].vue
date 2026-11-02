<script setup lang="ts">
import { ArrowLeftIcon, PencilIcon } from '@lucide/vue'

const route = useRoute('shelves-shelfId-coffees-coffeeId')
const shelfId = computed(() => route.params.shelfId)
const coffeeId = computed(() => route.params.coffeeId)

const editing = ref(false)

const { data: coffee, error } = await useFetch(
  () => `/api/shelves/${shelfId.value}/coffees/${coffeeId.value}`,
  { key: `coffee:${shelfId.value}:${coffeeId.value}` },
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

async function refreshEdited() {
  await refreshNuxtData([
    `coffee:${shelfId.value}:${coffeeId.value}`,
    `stock:${shelfId.value}`,
  ])
}

const euros = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'EUR',
})
</script>

<template>
  <main v-if="coffee" class="max-w-2xl">
    <NuxtLink
      :to="`/shelves/${shelfId}`"
      data-testid="coffee-back"
      class="mt-6 inline-flex items-center gap-2 text-xs uppercase lg:mt-10"
    >
      <ArrowLeftIcon class="size-4" aria-hidden="true" />
      Stock
    </NuxtLink>
    <header class="mt-4 flex items-end justify-between gap-4">
      <div>
        <p class="text-xs uppercase" data-testid="coffee-roaster-name">
          {{ coffee.roaster }}
        </p>
        <h1 class="mt-2 text-[48px] lg:text-[72px]" data-testid="coffee-title">
          {{ coffee.name }}
        </h1>
      </div>
      <button
        v-if="coffee.canEdit"
        type="button"
        data-testid="coffee-edit"
        class="mb-2 flex shrink-0 items-center gap-2 rounded-full border border-primary px-4 py-2 text-xs uppercase transition-colors hover:bg-primary hover:text-primary-foreground"
        @click="editing = true"
      >
        <PencilIcon class="size-4" aria-hidden="true" />
        Edit
      </button>
    </header>
    <CoffeeCard
      class="mt-8"
      :coffee="{ ...coffee, roastedOn: latestRoastedOn }"
    />
    <section class="mt-10">
      <h2 class="text-[28px]">Bags on this shelf</h2>
      <p
        v-if="!coffee.purchases.length"
        class="mt-3 text-xs"
        data-testid="purchases-empty"
      >
        Nobody on this shelf has bought it yet.
      </p>
      <ul
        v-else
        class="mt-4 divide-y rounded-[18px] border"
        data-testid="purchases"
      >
        <li
          v-for="purchase in coffee.purchases"
          :key="purchase.id"
          data-testid="purchase"
          class="grid grid-cols-2 gap-x-4 gap-y-1 p-4 text-xs sm:grid-cols-4"
        >
          <span data-testid="purchase-bought"
            >Bought {{ formatDate(purchase.purchasedOn) }}</span
          >
          <span data-testid="purchase-roasted">
            {{
              purchase.roastedOn
                ? `Roasted ${formatDate(purchase.roastedOn)}`
                : 'No roast date'
            }}
          </span>
          <span data-testid="purchase-size-price">
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
          <span class="uppercase sm:text-right" data-testid="purchase-status">
            {{ purchase.finishedAt ? 'Finished' : 'In stock' }}
          </span>
        </li>
      </ul>
    </section>
    <EditCoffeeSheet
      v-if="coffee.canEdit"
      v-model:open="editing"
      :shelf-id="shelfId"
      :coffee="coffee"
      @saved="refreshEdited"
    />
  </main>
</template>
