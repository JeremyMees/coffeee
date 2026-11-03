<script setup lang="ts">
import { ImageIcon } from '@lucide/vue'
import { NuxtLink } from '#components'

const props = withDefaults(defineProps<{ coffee: CardCoffee; to?: string }>(), {
  to: undefined,
})

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
    class="flex flex-col overflow-hidden rounded-[28px] shadow-[0_-6px_24px_rgb(31_79_216/0.12)]"
    :style="{ backgroundColor: coffee.colour, color: ink }"
  >
    <div class="h-44 shrink-0" data-testid="coffee-card-cover">
      <NuxtImg
        v-if="coffee.photoUrl"
        :src="coffee.photoUrl"
        alt=""
        sizes="100vw sm:640px"
        loading="lazy"
        class="size-full object-cover"
        data-testid="coffee-card-photo"
      />
      <div
        v-else
        class="flex size-full items-center justify-center bg-background/10"
        data-testid="coffee-card-placeholder"
      >
        <ImageIcon class="size-8 opacity-60" aria-hidden="true" />
      </div>
    </div>
    <div class="flex h-80 flex-col p-5">
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
      <ul
        v-if="coffee.flavorNotes.length"
        class="mt-4 flex flex-wrap gap-1.5"
        data-testid="coffee-card-flavor-notes"
      >
        <li
          v-for="note in coffee.flavorNotes"
          :key="note.id"
          data-testid="coffee-card-flavor-note"
          class="rounded-full bg-background/90 px-2.5 py-1 text-[11px] text-ink uppercase"
        >
          {{ note.name }}
        </li>
      </ul>
      <dl
        class="mt-auto grid grid-cols-2 gap-x-4 gap-y-3 rounded-[18px] bg-background p-4"
      >
        <div>
          <dt class="text-[10px] uppercase" :style="{ color: labelColour }">
            Roast
          </dt>
          <dd
            class="mt-0.5 font-sans font-semibold text-ink"
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
            class="mt-0.5 font-sans font-semibold text-ink"
            data-testid="coffee-card-freshness"
          >
            {{ days === null ? 'Unknown' : freshness(days, coffee.roastedFor) }}
          </dd>
        </div>
        <div class="col-span-2">
          <dt class="text-[10px] uppercase" :style="{ color: labelColour }">
            Rating
          </dt>
          <dd
            class="mt-0.5 font-sans font-semibold text-ink"
            data-testid="coffee-card-rating"
          >
            <RatingStars :rating="coffee.rating" />
          </dd>
        </div>
      </dl>
    </div>
  </component>
</template>
