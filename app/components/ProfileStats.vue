<script setup lang="ts">
import { useProfileStats } from '~/queries/account'

const { data, suspense } = useProfileStats()
await suspense()

const rows = computed(() => {
  const stats = data.value

  if (!stats) return []

  return [
    {
      key: 'bags',
      label: 'Bags bought',
      value: String(stats.bags),
    },
    {
      key: 'weight',
      label: 'Coffee bought',
      value: formatWeight(stats.grams),
    },
    {
      key: 'spent',
      label: 'Spent',
      value: formatPrice(stats.spentCents),
    },
    {
      key: 'rated',
      label: 'Coffees rated',
      value: String(stats.rated),
    },
    {
      key: 'average-rating',
      label: 'Average rating',
      value:
        stats.averageRating === null
          ? 'None yet'
          : `${stats.averageRating.toFixed(1)} stars`,
    },
    {
      key: 'buy-again',
      label: 'Would buy again',
      value: String(stats.wouldBuyAgain),
    },
    {
      key: 'top-roaster',
      label: 'Top roaster',
      value: stats.topRoaster ?? 'None yet',
    },
  ]
})
</script>

<template>
  <section class="flex flex-col gap-4" data-testid="profile-stats">
    <div>
      <h2 class="text-[28px]">Your coffee</h2>
      <p class="mt-1 text-xs">
        The bags you added and the coffees you rated, on every shelf.
      </p>
    </div>
    <dl
      class="grid grid-cols-2 gap-px overflow-hidden rounded-[18px] border bg-border text-xs"
    >
      <div
        v-for="row in rows"
        :key="row.key"
        class="flex min-w-0 flex-col gap-1 bg-background p-4 last:col-span-2"
      >
        <dt class="text-[11px] uppercase">{{ row.label }}</dt>
        <dd class="truncate text-sm" :data-testid="`stats-${row.key}`">
          {{ row.value }}
        </dd>
      </div>
    </dl>
  </section>
</template>
