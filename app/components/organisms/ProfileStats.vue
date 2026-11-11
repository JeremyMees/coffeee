<script setup lang="ts">
import { useProfileStats } from '~/queries/account'

const stats = useProfileStats()
const locale = useLocale()

function rowsOf(stats: ProfileStats) {
  return [
    {
      key: 'bags',
      label: 'Bags bought',
      value: String(stats.bags),
    },
    {
      key: 'weight',
      label: 'Coffee bought',
      value: formatWeight(stats.grams, locale.value),
    },
    {
      key: 'spent',
      label: 'Spent',
      value: formatPrice(stats.spentCents, locale.value),
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
          : `${formatRating(stats.averageRating, locale.value)} stars`,
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
}
</script>

<template>
  <section class="flex flex-col gap-4" data-testid="profile-stats">
    <div>
      <h2 class="text-[28px]">Your coffee</h2>
      <p class="mt-1 text-xs">
        The bags you added and the coffees you rated, on every shelf.
      </p>
    </div>
    <QuerySection :query="stats" testid="profile-stats">
      <template #default="{ data }">
        <dl
          class="grid grid-cols-2 gap-px overflow-hidden rounded-[18px] border bg-border text-xs"
        >
          <div
            v-for="row in rowsOf(data)"
            :key="row.key"
            class="flex min-w-0 flex-col gap-1 bg-background p-4 last:col-span-2"
          >
            <dt class="text-xs uppercase">{{ row.label }}</dt>
            <dd class="truncate text-sm" :data-testid="`stats-${row.key}`">
              {{ row.value }}
            </dd>
          </div>
        </dl>
      </template>
      <template #skeleton><ProfileStatsSkeleton /></template>
    </QuerySection>
  </section>
</template>
