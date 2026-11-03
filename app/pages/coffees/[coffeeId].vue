<script setup lang="ts">
import { ArrowLeftIcon } from '@lucide/vue'
import { useCoffee } from '~/queries/coffees'

const route = useRoute('coffees-coffeeId')
const coffeeId = computed(() => route.params.coffeeId)
const shelf = useCurrentShelf()
const back = computed(() => {
  const discover = `/shelves/${shelf.value?.id}/discover`
  const previous = import.meta.client ? window.history.state?.back : null

  return typeof previous === 'string' && previous.startsWith(discover)
    ? previous
    : discover
})

const editing = ref(false)

const { data: coffee, error, suspense } = useCoffee(coffeeId)
await suspense()

if (error.value || !coffee.value) {
  showError({ statusCode: 404, statusMessage: 'Coffee not found' })
}

useHead({ title: () => `${coffee.value?.name} · Coffeee` })
</script>

<template>
  <main v-if="coffee && shelf" class="max-w-2xl">
    <NuxtLink
      :to="back"
      data-testid="coffee-back"
      class="mt-6 inline-flex items-center gap-2 text-xs uppercase lg:mt-10"
    >
      <ArrowLeftIcon class="size-4" aria-hidden="true" />
      Discover
    </NuxtLink>
    <CoffeePhoto class="mt-4" :shelf-id="shelf.id" :coffee="coffee" />
    <CoffeeHeader
      :coffee="coffee"
      :editable="coffee.canEdit"
      @edit="editing = true"
    />
    <CoffeeDetailList :coffee="coffee" />
    <CoffeeVerdict :coffee-id="coffee.id" :verdict="coffee" />
    <RoasterDetails :shelf-id="shelf.id" :roaster="coffee.roasterDetails" />
    <CoffeeShelves :coffee-id="coffee.id" :shelves="coffee.shelves" />
    <EditCoffeeSheet
      v-if="coffee.canEdit"
      v-model:open="editing"
      :shelf-id="shelf.id"
      :coffee="coffee"
    />
  </main>
</template>
