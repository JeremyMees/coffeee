<script setup lang="ts">
import { ImageIcon } from '@lucide/vue'
import { NuxtLink } from '#components'

const props = withDefaults(defineProps<{ coffee: CardCoffee; to?: string }>(), {
  to: undefined,
})

const morph = useMorph('coffee', () => props.coffee.id)

const days = computed(() =>
  props.coffee.roastedOn ? daysOffRoast(props.coffee.roastedOn) : null,
)
const fresh = computed(() =>
  days.value === null
    ? 'Unknown'
    : freshness(days.value, props.coffee.roastedFor),
)
const roast = computed(
  () =>
    `${roastLevelLabels[props.coffee.roastLevel]} · ${roastedForLabels[props.coffee.roastedFor]}`,
)
const freshStyles: Record<string, string> = {
  Peak: 'bg-primary text-primary-foreground',
  Resting: 'border-dashed',
  'Past peak': 'border-transparent bg-accent',
  Unknown: 'border-dotted',
}
</script>

<template>
  <component
    :is="to ? NuxtLink : 'article'"
    :to="to"
    data-testid="coffee-card"
    class="flex h-full flex-col gap-2.5 rounded-[18px] border border-primary bg-background px-3.5 py-3 text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    @click="morph.open"
  >
    <div class="flex items-center gap-3">
      <div
        class="grid size-13 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-accent"
        :style="morph.name('photo')"
        data-testid="coffee-card-photo-frame"
      >
        <NuxtImg
          v-if="coffee.photoUrl"
          :src="coffee.photoUrl"
          alt=""
          sizes="52px"
          loading="lazy"
          class="size-full object-cover"
          data-testid="coffee-card-photo"
        />
        <ImageIcon
          v-else
          class="size-5 opacity-60"
          aria-hidden="true"
          data-testid="coffee-card-placeholder"
        />
      </div>
      <div class="min-w-0 flex-1">
        <p
          class="truncate text-[11px] uppercase"
          data-testid="coffee-card-roaster"
        >
          {{ coffee.roaster }}
        </p>
        <h2
          data-testid="coffee-card-name"
          :style="morph.name('name')"
          class="mt-[calc(--spacing(0.75)-0.1em)] mb-[-0.1em] w-fit py-[0.1em] font-sans text-[19px] leading-[1.05] font-semibold tracking-[-0.03em]"
        >
          {{ coffee.name }}
        </h2>
      </div>
    </div>
    <LazyMatchedBy
      v-if="coffee.matches"
      :matches="coffee.matches"
      testid="coffee-card"
    />
    <dl
      class="mt-auto flex flex-col gap-1.5 border-t border-primary pt-2.5 text-[11px] uppercase"
    >
      <div class="flex items-baseline gap-1.5">
        <dt>Roast</dt>
        <span
          class="min-w-3 flex-1 -translate-y-[3px] border-b border-dotted border-primary"
          aria-hidden="true"
        />
        <dd class="max-w-[68%] text-right" data-testid="coffee-card-roast">
          {{ roast }}
        </dd>
      </div>
      <div v-if="coffee.flavorNotes.length" class="flex items-baseline gap-1.5">
        <dt>Notes</dt>
        <span
          class="min-w-3 flex-1 -translate-y-[3px] border-b border-dotted border-primary"
          aria-hidden="true"
        />
        <dd class="max-w-[68%] text-right">
          <ul class="inline" data-testid="coffee-card-flavor-notes">
            <li
              v-for="note in coffee.flavorNotes"
              :key="note.id"
              data-testid="coffee-card-flavor-note"
              class="inline after:content-[',_'] last:after:content-none"
            >
              {{ note.name }}
            </li>
          </ul>
        </dd>
      </div>
      <div class="flex items-center gap-1.5">
        <dt>Rating</dt>
        <span
          class="min-w-3 flex-1 border-b border-dotted border-primary"
          aria-hidden="true"
        />
        <dd data-testid="coffee-card-rating">
          <RatingStars :rating="coffee.rating" />
        </dd>
      </div>
      <div class="flex items-center gap-1.5">
        <dt>Fresh</dt>
        <span
          class="min-w-3 flex-1 border-b border-dotted border-primary"
          aria-hidden="true"
        />
        <dd class="flex shrink-0 items-center gap-1.5">
          <span data-testid="coffee-card-days">
            {{ days === null ? 'No roast date' : `${days} days off roast` }}
          </span>
          <span
            :class="[
              'rounded-full border border-primary px-2 py-px text-[10px]',
              freshStyles[fresh],
            ]"
            data-testid="coffee-card-freshness"
          >
            {{ fresh }}
          </span>
        </dd>
      </div>
    </dl>
  </component>
</template>
