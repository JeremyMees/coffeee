<script setup lang="ts">
import { CheckIcon } from '@lucide/vue'

defineProps<{ verdicts: MemberVerdict[] }>()
</script>

<template>
  <section
    v-if="verdicts.length"
    class="mt-6 flex flex-col gap-3"
    data-testid="member-verdicts"
  >
    <h2 class="text-xs uppercase">Others on this shelf</h2>
    <ul class="flex flex-col gap-2">
      <li
        v-for="verdict in verdicts"
        :key="verdict.userId"
        class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
        :data-testid="`member-verdict-${verdict.userId}`"
      >
        <span class="min-w-24 font-semibold">{{ verdict.name }}</span>
        <RatingStars :rating="verdict.rating" />
        <span
          v-if="verdict.wouldBuyAgain"
          class="flex items-center gap-1 text-xs uppercase"
          data-testid="member-verdict-buy-again"
        >
          <CheckIcon class="size-3.5" aria-hidden="true" />
          Would buy again
        </span>
      </li>
    </ul>
  </section>
</template>
