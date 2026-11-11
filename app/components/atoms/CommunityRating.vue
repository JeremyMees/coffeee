<script setup lang="ts">
import { StarIcon } from '@lucide/vue'

defineProps<{ rating: CommunityRating }>()

const locale = useLocale()
</script>

<template>
  <span
    v-if="rating.average === null"
    data-testid="community-rating"
    data-rating="none"
    class="text-xs"
  >
    {{ communityRatingLabel(rating, locale) }}
  </span>
  <span
    v-else
    role="img"
    :aria-label="`Community rating ${communityRatingLabel(rating, locale)}`"
    data-testid="community-rating"
    :data-rating="rating.average.toFixed(1)"
    class="inline-flex items-center gap-1 text-xs"
  >
    <StarIcon class="size-3.5 fill-current" aria-hidden="true" />
    <span class="font-semibold">{{
      formatRating(rating.average, locale)
    }}</span>
    <span>({{ rating.raters }})</span>
  </span>
</template>
