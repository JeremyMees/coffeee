<script setup lang="ts">
const props = withDefaults(defineProps<{ coffee: CardCoffee; to?: string }>(), {
  to: undefined,
})

const days = computed(() =>
  props.coffee.roastedOn ? daysOffRoast(props.coffee.roastedOn) : null,
)
const fresh = computed(() =>
  days.value === null
    ? 'Unknown'
    : freshness(days.value, props.coffee.roastedFor),
)
const freshStyles: Record<string, string> = {
  Peak: 'bg-primary text-primary-foreground',
  Resting: 'border-dashed',
  'Past peak': 'border-transparent bg-accent',
  Unknown: 'border-dotted',
}
</script>

<template>
  <CoffeeSpecCard :coffee="coffee" :to="to" testid="coffee-card">
    <template #ratings>
      <SpecRow label="Rating" centered>
        <dd data-testid="coffee-card-rating">
          <RatingStars :rating="coffee.rating" />
        </dd>
      </SpecRow>
      <SpecRow label="Fresh" centered>
        <dd class="flex shrink-0 items-center gap-1.5">
          <span data-testid="coffee-card-days">
            {{ days === null ? 'No roast date' : `${days} days off roast` }}
          </span>
          <span
            :class="[
              'rounded-full border border-primary px-2 py-px text-xs',
              freshStyles[fresh],
            ]"
            data-testid="coffee-card-freshness"
          >
            {{ fresh }}
          </span>
        </dd>
      </SpecRow>
    </template>
  </CoffeeSpecCard>
</template>
