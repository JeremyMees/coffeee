<script setup lang="ts">
import { ArrowLeftIcon } from '@lucide/vue'
import { onlineManager } from '@tanstack/vue-query'
import {
  useCoffee,
  useCoffeeReviews,
  useCoffeeRoaster,
  useCoffeeShelves,
  useCoffeeVerdict,
} from '~/queries/coffees'

const route = useRoute('coffees-coffeeId')
const coffeeId = computed(() => idFrom(route.params.coffeeId))
const shelf = useCurrentShelf()
const { link: back, back: goBack } = useBackLink(() => ({
  label: 'Discover',
  to: shelf.value ? `${shelfPath(shelf.value)}/discover` : '/',
}))

const editing = ref(false)
const deleting = ref(false)

const coffeeQuery = useCoffee(coffeeId)
const { data: coffee, error } = coffeeQuery
const verdict = useCoffeeVerdict(coffeeId)
const reviews = useCoffeeReviews(coffeeId)
const roaster = useCoffeeRoaster(coffeeId)
const shelves = useCoffeeShelves(coffeeId)

function showMissing(failure: unknown) {
  if ((failure as { statusCode?: number } | null)?.statusCode === 404) {
    showError({ statusCode: 404, statusMessage: 'Coffee not found' })
  }
}

useCanonicalSlug(
  'coffees',
  () => route.params.coffeeId,
  () => coffee.value,
)

useHead({ title: () => `${coffee.value?.name ?? 'Coffee'} · Coffeee` })

await (onlineManager.isOnline() ? coffeeQuery.suspense() : undefined)
showMissing(error.value)
watch(error, showMissing)
</script>

<template>
  <main v-if="shelf" class="mx-auto max-w-2xl xl:max-w-7xl">
    <NuxtLink
      :to="back.to"
      data-testid="coffee-back"
      class="mt-6 inline-flex items-center gap-2 text-xs uppercase lg:mt-10"
      @click="goBack"
    >
      <ArrowLeftIcon class="size-4" aria-hidden="true" />
      {{ back.label }}
    </NuxtLink>
    <div class="xl:grid xl:grid-cols-2 xl:items-start xl:gap-16">
      <div>
        <template v-if="coffee">
          <CoffeePhoto class="mt-4" :coffee="coffee" />
          <CoffeeHeader
            :coffee="coffee"
            :roaster-id="coffee.roasterId"
            :editable="coffee.canEdit"
            :deletable="coffee.canDelete"
            @edit="editing = true"
            @delete="deleting = true"
          />
        </template>
        <template v-else>
          <h1 class="sr-only" data-testid="coffee-title-placeholder">Coffee</h1>
          <LazyCoffeeHeaderSkeleton v-if="!error" />
        </template>
        <QuerySection :query="coffeeQuery" testid="coffee">
          <template #default="{ data }">
            <CoffeeDetailList :coffee="data" />
            <DeleteCoffeeDialog
              v-if="data.canDelete"
              v-model:open="deleting"
              :coffee="data"
              @deleted="navigateTo(back.to)"
            />
            <EditCoffeeSheet
              v-if="data.canEdit"
              v-model:open="editing"
              :coffee="data"
            />
          </template>
          <template #skeleton><LazyCoffeeDetailListSkeleton /></template>
        </QuerySection>
      </div>
      <div class="xl:[&>:first-child]:mt-4">
        <QuerySection :query="verdict" testid="coffee-verdict">
          <template #default="{ data }">
            <CoffeeVerdict :coffee-id="coffeeId" :verdict="data" />
          </template>
          <template #skeleton><CoffeeVerdictSkeleton /></template>
        </QuerySection>
        <QuerySection :query="shelves" testid="coffee-shelves">
          <template #default="{ data }">
            <CoffeeShelves
              :coffee="{ id: coffeeId, name: coffee?.name ?? '' }"
              :shelves="data"
            />
          </template>
          <template #skeleton><CoffeeShelvesSkeleton /></template>
        </QuerySection>
        <QuerySection :query="reviews" testid="coffee-reviews">
          <template #default="{ data }">
            <CoffeeReviews
              :community-rating="data.communityRating"
              :reviews="data.reviews"
            />
          </template>
          <template #skeleton><CoffeeReviewsSkeleton /></template>
        </QuerySection>
        <QuerySection :query="roaster" testid="roaster-details">
          <template #default="{ data }">
            <RoasterDetails :roaster="data" />
          </template>
          <template #skeleton><RoasterDetailsSkeleton /></template>
        </QuerySection>
      </div>
    </div>
  </main>
</template>
