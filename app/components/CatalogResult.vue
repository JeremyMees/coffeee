<script setup lang="ts">
import { ImageIcon } from '@lucide/vue'

const props = defineProps<{ coffee: CatalogCoffee; to: string }>()

const matches = computed(() => matchLabels(props.coffee))
const described = computed(() =>
  [
    roastLevelLabels[props.coffee.roastLevel],
    roastedForLabels[props.coffee.roastedFor],
    originNames(props.coffee),
  ]
    .filter(Boolean)
    .join(' · '),
)
</script>

<template>
  <NuxtLink
    :to="to"
    data-testid="catalog-result"
    class="flex gap-4 rounded-[18px] border p-3 transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
  >
    <div
      class="grid size-16 shrink-0 place-items-center overflow-hidden rounded-[12px] bg-accent"
      data-testid="catalog-result-thumbnail"
    >
      <NuxtImg
        v-if="coffee.photoUrl"
        :src="coffee.photoUrl"
        alt=""
        sizes="64px"
        loading="lazy"
        class="size-full object-cover"
        data-testid="catalog-result-photo"
      />
      <ImageIcon
        v-else
        class="size-5 opacity-60"
        aria-hidden="true"
        data-testid="catalog-result-placeholder"
      />
    </div>
    <div class="min-w-0 flex-1">
      <div class="flex items-start justify-between gap-2">
        <p
          class="truncate text-[11px] uppercase"
          data-testid="catalog-result-roaster"
        >
          {{ coffee.roaster }}
        </p>
        <span
          v-if="coffee.onShelf"
          class="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground uppercase"
          data-testid="catalog-result-mine"
        >
          On your shelf
        </span>
      </div>
      <h2
        class="mt-0.5 truncate font-sans text-lg leading-tight font-semibold tracking-[-0.02em]"
        data-testid="catalog-result-name"
      >
        {{ coffee.name }}
      </h2>
      <p class="mt-1 truncate text-xs" data-testid="catalog-result-described">
        {{ described }}
      </p>
      <p class="mt-1.5" data-testid="catalog-result-community-rating">
        <CommunityRating :rating="coffee.communityRating" />
      </p>
      <ul
        v-if="matches.length"
        class="mt-2 flex flex-wrap gap-1.5"
        aria-label="Matched"
        data-testid="catalog-result-matches"
      >
        <li
          v-for="match in matches"
          :key="match"
          class="rounded-full bg-accent px-2.5 py-1 text-[11px] uppercase"
          data-testid="catalog-result-match"
        >
          {{ match }}
        </li>
      </ul>
    </div>
  </NuxtLink>
</template>
