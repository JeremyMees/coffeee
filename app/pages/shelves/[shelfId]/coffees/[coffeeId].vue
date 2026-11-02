<script setup lang="ts">
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  CheckIcon,
  PencilIcon,
  PlusIcon,
} from '@lucide/vue'
import { useShelfCoffee } from '~/queries/coffees'
import { useCoffeeFinish } from '~/queries/purchases'

const route = useRoute('shelves-shelfId-coffees-coffeeId')
const shelfId = computed(() => route.params.shelfId)
const coffeeId = computed(() => route.params.coffeeId)

const editing = ref(false)
const buying = ref(false)
const editingPurchase = ref<ShelfPurchase>()
const editingPurchaseOpen = ref(false)
const finishError = ref('')
const { mutateAsync: finishCoffee, isPending: finishing } = useCoffeeFinish()

const { data: coffee, error, suspense } = useShelfCoffee(shelfId, coffeeId)
await suspense()

if (error.value || !coffee.value) {
  showError({ statusCode: 404, statusMessage: 'Coffee not found' })
}

useHead({ title: () => `${coffee.value?.name} · Coffeee` })

const inStock = computed(
  () => coffee.value?.purchases.some(purchase => !purchase.finishedAt) ?? false,
)

function editPurchase(purchase: ShelfPurchase) {
  editingPurchase.value = purchase
  editingPurchaseOpen.value = true
}

async function finish() {
  finishError.value = ''

  try {
    await finishCoffee({ shelfId: shelfId.value, coffeeId: coffeeId.value })
  } catch (error) {
    finishError.value = serverErrors(error).message
  }
}

function names(entries: ListEntry[]) {
  return entries.map(entry => entry.name).join(', ')
}

function detailRows(shown: NonNullable<typeof coffee.value>) {
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
    { key: 'producers', label: 'Producer', value: names(shown.producers) },
    { key: 'farms', label: 'Farm', value: inOrigins(shown.farms) },
    {
      key: 'washing-stations',
      label: 'Washing station',
      value: inOrigins(shown.washingStations),
    },
    { key: 'processes', label: 'Process', value: names(shown.processes) },
    { key: 'varietals', label: 'Varietal', value: names(shown.varietals) },
  ].filter(row => row.value)
}

const outlined =
  'flex shrink-0 items-center gap-2 rounded-full border border-primary px-4 py-2 text-xs uppercase transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60'
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
    <CoffeePhoto class="mt-4" :shelf-id="shelfId" :coffee="coffee" />
    <header class="mt-6 flex items-end justify-between gap-4">
      <div>
        <p class="text-xs uppercase" data-testid="coffee-roaster-name">
          {{ coffee.roaster }}
        </p>
        <h1 class="mt-2 text-[48px] lg:text-[72px]" data-testid="coffee-title">
          {{ coffee.name }}
        </h1>
        <a
          v-if="coffee.link"
          :href="coffee.link"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="coffee-link-out"
          class="mt-2 inline-flex items-center gap-1 text-xs uppercase underline-offset-4 hover:underline"
        >
          At the roaster
          <ArrowUpRightIcon class="size-4" aria-hidden="true" />
        </a>
      </div>
      <button
        v-if="coffee.canEdit"
        type="button"
        data-testid="coffee-edit"
        :class="['mb-2', outlined]"
        @click="editing = true"
      >
        <PencilIcon class="size-4" aria-hidden="true" />
        Edit
      </button>
    </header>
    <CoffeeCard
      class="mt-8"
      :cover="false"
      :coffee="{ ...coffee, roastedOn: latestRoastDate(coffee.purchases) }"
    />
    <CoffeeVerdict
      :shelf-id="shelfId"
      :coffee-id="coffee.id"
      :verdict="coffee"
    />
    <dl
      v-if="detailRows(coffee).length"
      class="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-xs"
      data-testid="coffee-details"
    >
      <template v-for="row in detailRows(coffee)" :key="row.key">
        <dt class="uppercase">{{ row.label }}</dt>
        <dd :data-testid="`detail-${row.key}`">{{ row.value }}</dd>
      </template>
    </dl>
    <CoffeeGrindSettings
      :shelf-id="shelfId"
      :coffee-id="coffee.id"
      :grind-settings="coffee.grindSettings"
    />
    <section class="mt-10">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <h2 class="text-[28px]">Bags on this shelf</h2>
        <div class="flex gap-2">
          <button
            v-if="inStock"
            type="button"
            data-testid="coffee-finish"
            :class="outlined"
            :disabled="finishing"
            @click="finish"
          >
            <CheckIcon class="size-4" aria-hidden="true" />
            Finished
          </button>
          <button
            type="button"
            data-testid="coffee-buy-again"
            :class="outlined"
            @click="buying = true"
          >
            <PlusIcon class="size-4" aria-hidden="true" />
            Buy again
          </button>
        </div>
      </div>
      <Alert
        v-if="finishError"
        variant="destructive"
        class="mt-4"
        data-testid="coffee-finish-error"
      >
        <AlertDescription>{{ finishError }}</AlertDescription>
      </Alert>
      <p
        v-if="!coffee.purchases.length"
        class="mt-3 text-xs"
        data-testid="purchases-empty"
      >
        Nobody on this shelf has bought it yet.
      </p>
      <template v-else>
        <PurchaseSummary class="mt-4" :purchases="coffee.purchases" />
        <ul class="mt-4 divide-y rounded-[18px] border" data-testid="purchases">
          <PurchaseRow
            v-for="purchase in coffee.purchases"
            :key="purchase.id"
            :shelf-id="shelfId"
            :coffee-id="coffee.id"
            :purchase="purchase"
            @edit="editPurchase(purchase)"
          />
        </ul>
      </template>
    </section>
    <PurchaseSheet
      v-model:open="buying"
      :shelf-id="shelfId"
      :coffee-id="coffee.id"
      :purchases="coffee.purchases"
    />
    <PurchaseSheet
      v-if="editingPurchase"
      v-model:open="editingPurchaseOpen"
      :shelf-id="shelfId"
      :coffee-id="coffee.id"
      :purchases="coffee.purchases"
      :purchase="editingPurchase"
    />
    <EditCoffeeSheet
      v-if="coffee.canEdit"
      v-model:open="editing"
      :shelf-id="shelfId"
      :coffee="coffee"
    />
  </main>
</template>
