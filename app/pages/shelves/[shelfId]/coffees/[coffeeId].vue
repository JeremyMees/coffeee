<script setup lang="ts">
import { ArrowLeftIcon, PencilIcon } from '@lucide/vue'
import { useShelfCoffee } from '~/queries/coffees'

const route = useRoute('shelves-shelfId-coffees-coffeeId')
const shelfId = computed(() => route.params.shelfId)
const coffeeId = computed(() => route.params.coffeeId)

const editing = ref(false)

const { data: coffee, error, suspense } = useShelfCoffee(shelfId, coffeeId)
await suspense()

if (error.value || !coffee.value) {
  showError({ statusCode: 404, statusMessage: 'Coffee not found' })
}

useHead({ title: () => `${coffee.value?.name} · Coffeee` })

const latestRoastedOn = computed(
  () =>
    coffee.value?.purchases.find(purchase => purchase.roastedOn)?.roastedOn ??
    null,
)

function grownAt(shown: NonNullable<typeof coffee.value>) {
  const inOrigins = (entries: OriginEntry[]) =>
    entries
      .map(entry =>
        shown.origins.length > 1
          ? `${entry.name} (${originName(entry.origin)})`
          : entry.name,
      )
      .join(', ')

  return [
    {
      key: 'origins',
      label: 'Origin',
      value: shown.origins.map(origin => origin.name).join(', '),
    },
    { key: 'regions', label: 'Region', value: inOrigins(shown.regions) },
    {
      key: 'altitude',
      label: 'Altitude',
      value: formatAltitude(shown.altitudeFrom, shown.altitudeTo) ?? '',
    },
    {
      key: 'producers',
      label: 'Producer',
      value: shown.producers.map(producer => producer.name).join(', '),
    },
    { key: 'farms', label: 'Farm', value: inOrigins(shown.farms) },
    {
      key: 'washing-stations',
      label: 'Washing station',
      value: inOrigins(shown.washingStations),
    },
  ].filter(row => row.value)
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
    <dl
      v-if="grownAt(coffee).length"
      class="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-xs"
      data-testid="grown-at"
    >
      <template v-for="row in grownAt(coffee)" :key="row.key">
        <dt class="uppercase">{{ row.label }}</dt>
        <dd :data-testid="`grown-${row.key}`">{{ row.value }}</dd>
      </template>
    </dl>
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
    />
  </main>
</template>
