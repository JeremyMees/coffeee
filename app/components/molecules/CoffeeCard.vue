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
    class="isolate flex flex-col overflow-hidden rounded-[28px] border border-primary bg-background text-primary"
    @click="morph.open"
  >
    <div
      class="h-44 shrink-0 border-b border-primary"
      :style="morph.name('photo')"
      data-testid="coffee-card-photo-frame"
    >
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
        class="flex size-full items-center justify-center"
        data-testid="coffee-card-placeholder"
      >
        <ImageIcon class="size-8 opacity-60" aria-hidden="true" />
      </div>
    </div>
    <div class="flex h-72 flex-col p-5">
      <p
        class="truncate text-[11px] uppercase"
        data-testid="coffee-card-roaster"
      >
        {{ coffee.roaster }}
      </p>
      <h2
        data-testid="coffee-card-name"
        :style="morph.name('name')"
        class="mt-[calc(--spacing(1.5)-0.1em)] mb-[-0.1em] line-clamp-2 w-fit py-[0.1em] font-sans text-[32px] leading-none font-semibold tracking-[-0.045em]"
      >
        {{ coffee.name }}
      </h2>
      <LazyMatchedBy
        v-if="coffee.matches"
        class="mt-2"
        :matches="coffee.matches"
        testid="coffee-card"
      />
      <ul
        v-if="coffee.flavorNotes.length"
        class="mt-4 flex flex-wrap gap-1.5"
        data-testid="coffee-card-flavor-notes"
      >
        <li
          v-for="note in coffee.flavorNotes"
          :key="note.id"
          data-testid="coffee-card-flavor-note"
          class="rounded-full border border-primary px-2.5 py-1 text-[11px] uppercase"
        >
          {{ note.name }}
        </li>
      </ul>
      <div
        class="mt-auto flex items-end justify-between gap-4 border-t border-primary pt-3"
      >
        <dl class="min-w-0 text-[11px] uppercase">
          <dt class="sr-only">Roast</dt>
          <dd data-testid="coffee-card-roast">{{ roast }}</dd>
          <dt class="sr-only">Rating</dt>
          <dd class="mt-1" data-testid="coffee-card-rating">
            <RatingStars :rating="coffee.rating" />
          </dd>
        </dl>
        <div class="shrink-0 text-right">
          <p data-testid="coffee-card-days">
            <span
              class="block font-sans text-[52px] leading-[0.85] font-semibold tracking-[-0.045em]"
            >
              {{ days ?? '–' }}
            </span>
            <span class="text-[11px] uppercase">
              {{ days === null ? 'no roast date' : 'days off roast' }}
            </span>
          </p>
          <p class="text-[11px] uppercase" data-testid="coffee-card-freshness">
            {{ days === null ? 'Unknown' : freshness(days, coffee.roastedFor) }}
          </p>
        </div>
      </div>
    </div>
  </component>
</template>
