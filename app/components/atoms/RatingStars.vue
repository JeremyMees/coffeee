<script setup lang="ts">
import { StarIcon } from '@lucide/vue'

defineProps<{ rating: number | null }>()
</script>

<template>
  <span
    role="img"
    :aria-label="ratingLabel(rating)"
    data-testid="rating-stars"
    :data-rating="rating ?? 'none'"
    class="inline-flex gap-0.5"
  >
    <StarIcon
      v-for="star in ratings"
      :key="star"
      :class="[
        'size-4',
        rating !== null && star <= rating ? 'fill-current' : 'opacity-30',
      ]"
      aria-hidden="true"
    />
  </span>
</template>
