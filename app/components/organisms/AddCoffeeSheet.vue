<script setup lang="ts">
import { useCoffeeCreate } from '~/queries/coffees'
import { useShelfPurchases } from '~/queries/purchases'

const open = useAddCoffee()
const link = useAddCoffeeLink()
const shelf = useCurrentShelf()
const { mutateAsync: createCoffee } = useCoffeeCreate()

const picked = ref<CoffeeMatch | null>(null)
const buying = ref(false)
const purchases = useShelfPurchases(
  () => shelf.value?.id ?? '',
  () => picked.value?.id ?? '',
  () => Boolean(shelf.value && picked.value?.onShelf),
)
const bagReady = computed(
  () => picked.value && (!picked.value.onShelf || purchases.data.value),
)

async function add(coffee: NewCoffee) {
  if (!shelf.value) {
    throw createError({ statusMessage: 'Join a shelf before adding a coffee' })
  }

  const added = await createCoffee({ shelfId: shelf.value.id, coffee })

  return added.coffee.id
}

function addBag(coffee: CoffeeMatch) {
  picked.value = coffee
  open.value = false
  buying.value = true
}

watch(open, isOpen => {
  if (!isOpen) link.value = null
})

function stock() {
  return shelf.value && shelfPath(shelf.value)
}

async function goToStock() {
  const destination = stock()

  if (destination) await navigateTo(destination)
}
</script>

<template>
  <CoffeeFormSheet
    v-model:open="open"
    prefix="add-coffee"
    title="Add coffee"
    description="A coffee you just bought, with its first bag."
    submit-label="Add coffee"
    first-bag
    :link="link"
    :send="add"
    :go-to="stock"
  >
    <template v-if="shelf" #match>
      <CoffeeMatchNotice :shelf-id="shelf.id" @pick="addBag" />
    </template>
  </CoffeeFormSheet>
  <PurchaseSheet
    v-if="shelf && picked && bagReady"
    v-model:open="buying"
    :shelf-id="shelf.id"
    :coffee-id="picked.id"
    :purchases="purchases.data.value ?? []"
    @saved="goToStock"
  />
</template>
