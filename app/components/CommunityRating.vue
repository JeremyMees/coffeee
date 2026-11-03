<script setup lang="ts">
import { StarIcon } from '@lucide/vue'

defineProps<{ rating: CommunityRating }>()
</script>

<template>
  <span
    v-if="rating.average === null"
    data-testid="community-rating"
    data-rating="none"
    class="text-xs"
  >
    {{ communityRatingLabel(rating) }}
  </span>
  <span
    v-else
    role="img"
    :aria-label="`Community rating ${communityRatingLabel(rating)}`"
    data-testid="community-rating"
    :data-rating="rating.average.toFixed(1)"
    class="inline-flex items-center gap-1 text-xs"
  >
    <StarIcon class="size-3.5 fill-current" aria-hidden="true" />
    <span class="font-semibold">{{ rating.average.toFixed(1) }}</span>
    <span>({{ rating.raters }})</span>
  </span>
</template>
