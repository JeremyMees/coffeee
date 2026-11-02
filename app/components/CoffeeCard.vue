<script setup lang="ts">
import { NuxtLink } from '#components'

const props = defineProps<{ coffee: CardCoffee; to?: string }>()

const ink = computed(() => inkOn(props.coffee.colour))
const labelColour = computed(() =>
  ink.value === '#1d1d1f' ? ink.value : props.coffee.colour,
)
const days = computed(() =>
  props.coffee.roastedOn ? daysOffRoast(props.coffee.roastedOn) : null,
)
const roast = computed(
  () =>
    `${roastLevelLabels[props.coffee.roastLevel]} · ${roastedForLabels[props.coffee.roastedFor]}`,
)
</script>

<template>
  <component
    :is="to ? NuxtLink : 'article'"
    :to="to"
    data-testid="coffee-card"
    class="flex h-80 flex-col rounded-[28px] p-5 shadow-[0_-6px_24px_rgb(31_79_216/0.12)]"
    :style="{ backgroundColor: coffee.colour, color: ink }"
  >
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <p
          class="truncate text-[11px] uppercase"
          data-testid="coffee-card-roaster"
        >
          {{ coffee.roaster }}
        </p>
        <h2
          data-testid="coffee-card-name"
          class="mt-1.5 line-clamp-2 font-sans text-[28px] leading-[0.95] font-semibold tracking-[-0.045em]"
        >
          {{ coffee.name }}
        </h2>
      </div>
      <p class="shrink-0 text-right" data-testid="coffee-card-days">
        <span
          class="block font-sans text-[44px] leading-[0.85] font-semibold tracking-[-0.045em]"
        >
          {{ days ?? '–' }}
        </span>
        <span class="text-[10px] uppercase">
          {{ days === null ? 'no roast date' : 'days off roast' }}
        </span>
      </p>
    </div>
    <dl
      class="mt-auto grid grid-cols-2 gap-x-4 gap-y-3 rounded-[18px] bg-background p-4"
    >
      <div>
        <dt class="text-[10px] uppercase" :style="{ color: labelColour }">
          Roast
        </dt>
        <dd
          class="mt-0.5 font-sans font-semibold text-[#1d1d1f]"
          data-testid="coffee-card-roast"
        >
          {{ roast }}
        </dd>
      </div>
      <div>
        <dt class="text-[10px] uppercase" :style="{ color: labelColour }">
          Freshness
        </dt>
        <dd
          class="mt-0.5 font-sans font-semibold text-[#1d1d1f]"
          data-testid="coffee-card-freshness"
        >
          {{ days === null ? 'Unknown' : freshness(days, coffee.roastedFor) }}
        </dd>
      </div>
    </dl>
  </component>
</template>
