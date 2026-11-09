<script setup lang="ts">
import { ArrowLeftIcon } from '@lucide/vue'
import {
  useCoffee,
  useCoffeePreview,
  useCoffeeReviews,
  useCoffeeRoaster,
  useCoffeeShelves,
  useCoffeeVerdict,
} from '~/queries/coffees'

const route = useRoute('coffees-coffeeId')
const coffeeId = computed(() => idFrom(route.params.coffeeId))
const shelf = useCurrentShelf()
const shelfId = computed(() => shelf.value?.id ?? '')
const { link: back, back: goBack } = useBackLink(() => ({
  label: 'Discover',
  to: shelf.value ? `${shelfPath(shelf.value)}/discover` : '/',
}))

const editing = ref(false)
const deleting = ref(false)

const coffeeQuery = useCoffee(coffeeId)
const { data: coffee, error } = coffeeQuery
const preview = useCoffeePreview(shelfId, coffeeId)
const shown = computed(() => coffee.value ?? preview.value)
const verdict = useCoffeeVerdict(coffeeId)
const reviews = useCoffeeReviews(coffeeId)
const roaster = useCoffeeRoaster(coffeeId)
const shelves = useCoffeeShelves(coffeeId)

watch(
  error,
  failure => {
    if ((failure as { statusCode?: number } | null)?.statusCode === 404) {
      showError({ statusCode: 404, statusMessage: 'Coffee not found' })
    }
  },
  { immediate: true },
)

useCanonicalSlug(
  'coffees',
  () => route.params.coffeeId,
  () => coffee.value,
)

useHead({ title: () => `${shown.value?.name ?? 'Coffee'} · Coffeee` })
</script>

<template>
  <main v-if="shelf" class="max-w-2xl">
    <NuxtLink
      :to="back.to"
      data-testid="coffee-back"
      class="mt-6 inline-flex items-center gap-2 text-xs uppercase lg:mt-10"
      @click="goBack"
    >
      <ArrowLeftIcon class="size-4" aria-hidden="true" />
      {{ back.label }}
    </NuxtLink>
    <template v-if="shown">
      <CoffeePhoto
        class="mt-4"
        :shelf-id="shelf.id"
        :coffee="{ ...shown, canEdit: coffee?.canEdit }"
      />
      <CoffeeHeader
        :coffee="coffee ?? shown"
        :roaster-id="coffee?.roasterId"
        :editable="coffee?.canEdit"
        :deletable="coffee?.canDelete"
        @edit="editing = true"
        @delete="deleting = true"
      />
    </template>
    <CoffeeHeaderSkeleton v-else-if="!error" />
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
          :shelf-id="shelf.id"
          :coffee="data"
        />
      </template>
      <template #skeleton><CoffeeDetailListSkeleton /></template>
    </QuerySection>
    <QuerySection :query="verdict" testid="coffee-verdict">
      <template #default="{ data }">
        <CoffeeVerdict :coffee-id="coffeeId" :verdict="data" />
      </template>
      <template #skeleton><CoffeeVerdictSkeleton /></template>
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
    <QuerySection :query="shelves" testid="coffee-shelves">
      <template #default="{ data }">
        <CoffeeShelves
          :coffee="{ id: coffeeId, name: shown?.name ?? '' }"
          :shelves="data"
        />
      </template>
      <template #skeleton><CoffeeShelvesSkeleton /></template>
    </QuerySection>
  </main>
</template>
