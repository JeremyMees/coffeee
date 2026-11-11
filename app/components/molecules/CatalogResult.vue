<script setup lang="ts">
const props = defineProps<{
  coffee: CatalogCoffee
  to: string
  hideRoaster?: boolean
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
        v-if="coffee.onShelf"
        class="shrink-0 self-start rounded-full border border-primary px-2 py-px text-xs uppercase"
        data-testid="catalog-result-mine"
      >
        On your shelf
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
    </template>
  </CoffeeSpecCard>
</template>
