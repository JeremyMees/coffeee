<script setup lang="ts">
import { StarIcon } from '@lucide/vue'

defineProps<{ rating: number | null }>()
</script>

<template>
  <span
    v-if="rating === null"
    data-testid="rating-stars"
    data-rating="none"
    class="text-xs"
  >
    {{ ratingLabel(rating) }}
  </span>
  <span
    v-else
    role="img"
    :aria-label="ratingLabel(rating)"
    data-testid="rating-stars"
    :data-rating="rating"
    class="inline-flex gap-0.5"
  >
    <StarIcon
      v-for="star in ratings"
      :key="star"
      :class="['size-4', star <= rating ? 'fill-current' : 'opacity-30']"
      aria-hidden="true"
    />
  </span>
</template>
