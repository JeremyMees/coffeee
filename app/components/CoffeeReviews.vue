<script setup lang="ts">
import { CheckIcon } from '@lucide/vue'

defineProps<{ communityRating: CoffeeCommunityRating; reviews: Review[] }>()
</script>

<template>
  <section class="mt-6 flex flex-col gap-3" data-testid="coffee-reviews">
    <h2 class="text-xs uppercase">Reviews</h2>
    <p
      v-if="communityRating.average === null"
      class="text-xs"
      data-testid="coffee-reviews-unrated"
    >
      Nobody has rated this coffee yet.
    </p>
    <p
      v-else
      class="flex items-baseline gap-3"
      data-testid="coffee-reviews-average"
    >
      <span
        class="font-sans text-[40px] leading-none font-semibold tracking-[-0.045em]"
      >
        {{ communityRating.average.toFixed(1) }}
      </span>
      <span class="text-xs">
        from {{ communityRating.raters }}
        {{ communityRating.raters === 1 ? 'person' : 'people' }}
      </span>
    </p>
    <p
      v-if="communityRating.wouldBuyAgain"
      class="text-xs"
      data-testid="coffee-reviews-buy-again"
    >
      {{ communityRating.wouldBuyAgain }}
      {{ communityRating.wouldBuyAgain === 1 ? 'person' : 'people' }} would buy
      it again
    </p>
    <ul v-if="reviews.length" class="flex flex-col gap-2">
      <li
        v-for="review in reviews"
        :key="review.userId"
        class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
        :data-testid="`review-${review.userId}`"
      >
        <span class="min-w-24 font-semibold">
          {{ review.name }}
          <span
            v-if="review.mine"
            class="ml-1 text-xs font-normal uppercase"
            data-testid="review-mine"
          >
            (you)
          </span>
        </span>
        <RatingStars :rating="review.rating" />
        <span
          v-if="review.wouldBuyAgain"
          class="flex items-center gap-1 text-xs uppercase"
          data-testid="review-buy-again"
        >
          <CheckIcon class="size-3.5" aria-hidden="true" />
          Would buy again
        </span>
      </li>
    </ul>
  </section>
</template>
