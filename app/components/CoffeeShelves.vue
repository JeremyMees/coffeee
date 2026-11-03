<script setup lang="ts">
import { ArrowRightIcon } from '@lucide/vue'

defineProps<{ coffeeId: string; shelves: CoffeeShelf[] }>()
</script>

<template>
  <section class="mt-10" data-testid="coffee-shelves">
    <h2 class="text-[28px]">On your shelves</h2>
    <ul class="mt-4 divide-y rounded-[18px] border">
      <li v-for="shelf in shelves" :key="shelf.id">
        <NuxtLink
          :to="`/shelves/${shelf.id}/coffees/${coffeeId}`"
          :data-testid="`coffee-shelf-${shelf.id}`"
          class="flex items-center justify-between gap-4 p-4 text-xs transition-colors hover:bg-accent"
        >
          <span class="flex min-w-0 flex-col gap-1">
            <span class="font-sans text-sm font-semibold">{{
              shelf.name
            }}</span>
            <span data-testid="coffee-shelf-bags">{{ shelfBags(shelf) }}</span>
          </span>
          <ArrowRightIcon class="size-4 shrink-0" aria-hidden="true" />
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>
