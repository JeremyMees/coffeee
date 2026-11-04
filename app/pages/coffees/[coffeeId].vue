<script setup lang="ts">
import { ArrowLeftIcon } from '@lucide/vue'
import { useCoffee } from '~/queries/coffees'

const route = useRoute('coffees-coffeeId')
const coffeeId = computed(() => idFrom(route.params.coffeeId))
const shelf = useCurrentShelf()
const { link: back, back: goBack } = useBackLink(() => ({
  label: 'Discover',
  to: shelf.value ? `${shelfPath(shelf.value)}/discover` : '/',
}))

const editing = ref(false)
const deleting = ref(false)

const { data: coffee, error, suspense } = useCoffee(coffeeId)
await suspense()

if (error.value || !coffee.value) {
  showError({ statusCode: 404, statusMessage: 'Coffee not found' })
}

await useCanonicalSlug(
  'coffees',
  () => route.params.coffeeId,
  () => coffee.value,
)

useHead({ title: () => `${coffee.value?.name} · Coffeee` })
</script>

<template>
  <main v-if="coffee && shelf" class="max-w-2xl">
    <NuxtLink
      :to="back.to"
      data-testid="coffee-back"
      class="mt-6 inline-flex items-center gap-2 text-xs uppercase lg:mt-10"
      @click="goBack"
    >
      <ArrowLeftIcon class="size-4" aria-hidden="true" />
      {{ back.label }}
    </NuxtLink>
    <CoffeePhoto class="mt-4" :shelf-id="shelf.id" :coffee="coffee" />
    <CoffeeHeader
      :coffee="coffee"
      :editable="coffee.canEdit"
      :deletable="coffee.canDelete"
      @edit="editing = true"
      @delete="deleting = true"
    />
    <CoffeeDetailList :coffee="coffee" />
    <CoffeeVerdict :coffee-id="coffee.id" :verdict="coffee" />
    <CoffeeReviews
      :community-rating="coffee.communityRating"
      :reviews="coffee.reviews"
    />
    <RoasterDetails :shelf-id="shelf.id" :roaster="coffee.roasterDetails" />
    <CoffeeShelves :coffee="coffee" :shelves="coffee.shelves" />
    <DeleteCoffeeDialog
      v-if="coffee.canDelete"
      v-model:open="deleting"
      :coffee="coffee"
      @deleted="navigateTo(back.to)"
    />
    <EditCoffeeSheet
      v-if="coffee.canEdit"
      v-model:open="editing"
      :shelf-id="shelf.id"
      :coffee="coffee"
    />
  </main>
</template>
