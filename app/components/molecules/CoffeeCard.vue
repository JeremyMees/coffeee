<script setup lang="ts">
const props = withDefaults(defineProps<{ coffee: CardCoffee; to?: string }>(), {
  to: undefined,
})

const days = computed(() => {
  const { roastedOn, frozenOn, thawedOn } = props.coffee

  return roastedOn ? daysOffRoast({ roastedOn, frozenOn, thawedOn }) : null
})
const age = computed(() => {
  if (days.value === null) return 'No roast date'

  return isFrozen(props.coffee)
    ? `Frozen at ${days.value} days`
    : `${days.value} days off roast`
})
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
            {{ age }}
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
