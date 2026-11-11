<script setup lang="ts">
const props = defineProps<{ purchases: ShelfPurchase[] }>()

const locale = useLocale()

const rows = computed(() => {
  const bought = lastBought(props.purchases)
  const roasted = latestRoastDate(props.purchases)
  const price = latestPrice(props.purchases)
  const perGram = pricePerGram(props.purchases)
  const times = timesBought(props.purchases)

  return [
    {
      key: 'last-bought',
      label: 'Last bought',
      value: bought ? formatDate(bought, locale.value) : 'Never',
    },
    {
      key: 'latest-roast',
      label: 'Latest roast date',
      value: roasted ? formatDate(roasted, locale.value) : 'Unknown',
    },
    {
      key: 'latest-price',
      label: 'Latest price',
      value: price === null ? 'Unknown' : formatPrice(price, locale.value),
    },
    {
      key: 'price-per-gram',
      label: 'Price per gram',
      value:
        perGram === null
          ? 'Unknown'
          : formatPricePerGram(perGram, locale.value),
    },
    {
      key: 'times-bought',
      label: 'Times bought',
      value: times === 1 ? 'Once' : `${times} times`,
    },
  ]
})
</script>

<template>
  <dl
    class="grid grid-cols-2 gap-px overflow-hidden rounded-[18px] border bg-border text-xs sm:grid-cols-5"
    data-testid="purchase-summary"
  >
    <div
      v-for="row in rows"
      :key="row.key"
      class="flex flex-col gap-1 bg-background p-4 last:col-span-2 sm:last:col-span-1"
    >
      <dt class="text-[11px] uppercase">{{ row.label }}</dt>
      <dd class="text-sm" :data-testid="`summary-${row.key}`">
        {{ row.value }}
      </dd>
    </div>
  </dl>
</template>
