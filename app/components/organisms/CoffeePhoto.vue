<script setup lang="ts">
import { ImageIcon } from '@lucide/vue'

const props = defineProps<{ coffee: PhotoCoffee }>()

const morph = useMorph('coffee', () => props.coffee.id)
morph.open()
</script>

<template>
  <figure
    data-testid="coffee-photo"
    class="aspect-4/3 overflow-hidden rounded-[28px] bg-accent"
    :style="morph.name('photo')"
  >
    <NuxtImg
      v-if="coffee.photoUrl"
      :src="coffee.photoUrl"
      :alt="`The bag of ${coffee.name}`"
      sizes="100vw sm:672px xl:620px"
      width="672"
      height="504"
      :preload="{ fetchPriority: 'high' }"
      fetchpriority="high"
      class="size-full object-cover"
      data-testid="coffee-photo-image"
    />
    <div
      v-else
      class="flex size-full flex-col items-center justify-center gap-2 text-xs uppercase"
      data-testid="coffee-photo-placeholder"
    >
      <ImageIcon class="size-8" aria-hidden="true" />
      No photo yet
    </div>
  </figure>
</template>
