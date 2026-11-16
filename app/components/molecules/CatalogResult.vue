<script setup lang="ts">
const props = defineProps<{
  coffee: CatalogCoffee | LibraryCoffee
  to: string
  hideRoaster?: boolean
  hideBought?: boolean
}>()

const origins = computed(() => originNames(props.coffee))
</script>

<template>
  <CoffeeSpecCard
    :coffee="coffee"
    :to="to"
    :hide-roaster="hideRoaster"
    testid="catalog-result"
  >
    <template #badge>
      <span
        v-if="coffee.onShelf && !hideBought"
        class="shrink-0 self-start rounded-full border border-primary px-2 py-px text-xs uppercase"
        data-testid="catalog-result-bought"
      >
        Bought
      </span>
    </template>
    <template #facts>
      <SpecRow v-if="origins" label="Origin">
        <dd class="max-w-[68%] text-right" data-testid="catalog-result-origins">
          {{ origins }}
        </dd>
      </SpecRow>
    </template>
    <template #ratings>
      <SpecRow label="Community" centered>
        <dd data-testid="catalog-result-community-rating">
          <CommunityRating :rating="coffee.communityRating" />
        </dd>
      </SpecRow>
      <SpecRow label="Your rating" centered>
        <dd data-testid="catalog-result-rating">
          <RatingStars v-if="coffee.rating !== null" :rating="coffee.rating" />
          <span v-else class="text-muted-foreground">Not rated</span>
        </dd>
      </SpecRow>
    </template>
  </CoffeeSpecCard>
</template>
