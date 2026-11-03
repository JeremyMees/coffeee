<script setup lang="ts">
import { CheckIcon, HeartIcon, StarIcon } from '@lucide/vue'
import { useVerdictUpdate } from '~/queries/verdicts'

const props = defineProps<{
  coffeeId: string
  verdict: Verdict
}>()

const error = ref('')
const { mutateAsync: updateVerdict, isPending: saving } = useVerdictUpdate()

const favourite = computed(() => isFavourite(props.verdict))

async function judge(verdict: VerdictChange) {
  error.value = ''

  try {
    await updateVerdict({
      coffeeId: props.coffeeId,
      verdict,
    })
  } catch (failure) {
    error.value = serverErrors(failure).message
  }
}

function rate(star: Rating) {
  return judge({ rating: star === props.verdict.rating ? null : star })
}

function starLabel(star: Rating) {
  return star === props.verdict.rating
    ? `Clear the ${ratingLabel(star)} rating`
    : `Rate it ${ratingLabel(star)}`
}
</script>

<template>
  <section class="mt-8 flex flex-col gap-4" data-testid="coffee-verdict">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="flex" role="group" aria-label="Rating">
          <button
            v-for="star in ratings"
            :key="star"
            type="button"
            :data-testid="`verdict-star-${star}`"
            :aria-label="starLabel(star)"
            :aria-pressed="star === verdict.rating"
            :disabled="saving"
            class="p-1 text-primary disabled:opacity-60"
            @click="rate(star)"
          >
            <StarIcon
              :class="[
                'size-6',
                verdict.rating !== null && star <= verdict.rating
                  ? 'fill-current'
                  : 'opacity-40',
              ]"
              aria-hidden="true"
            />
          </button>
        </div>
        <span class="text-xs uppercase" data-testid="verdict-rating">
          {{ ratingLabel(verdict.rating) }}
        </span>
      </div>
      <span
        v-if="favourite"
        class="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground uppercase"
        data-testid="verdict-favourite"
      >
        <HeartIcon class="size-3.5 fill-current" aria-hidden="true" />
        Favourite
      </span>
    </div>
    <button
      type="button"
      data-testid="verdict-buy-again"
      :aria-pressed="verdict.wouldBuyAgain"
      :disabled="saving"
      :class="[
        'flex w-fit items-center gap-2 rounded-full border border-primary px-4 py-2 text-xs uppercase transition-colors disabled:opacity-60',
        verdict.wouldBuyAgain
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-primary hover:text-primary-foreground',
      ]"
      @click="judge({ wouldBuyAgain: !verdict.wouldBuyAgain })"
    >
      <CheckIcon
        :class="['size-4', !verdict.wouldBuyAgain && 'opacity-0']"
        aria-hidden="true"
      />
      Would buy again
    </button>
    <Alert v-if="error" variant="destructive" data-testid="verdict-error">
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>
  </section>
</template>
