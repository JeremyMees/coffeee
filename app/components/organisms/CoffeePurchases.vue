<script setup lang="ts">
import { PlusIcon } from '@lucide/vue'
import { useShelfPurchases } from '~/queries/purchases'

const props = defineProps<{ shelfId: string; coffeeId: string }>()

const purchases = useShelfPurchases(
  () => props.shelfId,
  () => props.coffeeId,
)
const { data: loaded } = purchases

const buying = ref(false)
const editingPurchase = ref<ShelfPurchase>()
const editingPurchaseOpen = ref(false)

function editPurchase(purchase: ShelfPurchase) {
  editingPurchase.value = purchase
  editingPurchaseOpen.value = true
}
</script>

<template>
  <section class="mt-10" data-testid="coffee-purchases">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <h2 class="text-[28px]">Bags on this shelf</h2>
      <Button
        v-if="loaded"
        type="button"
        data-testid="coffee-buy-again"
        variant="outline"
        size="sm"
        @click="buying = true"
      >
        <PlusIcon class="size-4" aria-hidden="true" />
        {{ loaded.length ? 'Buy again' : 'Add to shelf' }}
      </Button>
    </div>
    <QuerySection :query="purchases" testid="coffee-purchases">
      <template #default="{ data }">
        <p
          v-if="!data.length"
          class="mt-3 text-xs"
          data-testid="purchases-empty"
        >
          Nobody on this shelf has bought it yet.
        </p>
        <template v-else>
          <PurchaseSummary class="mt-4" :purchases="data" />
          <ul
            class="mt-4 divide-y rounded-[18px] border"
            data-testid="purchases"
          >
            <PurchaseRow
              v-for="purchase in data"
              :key="purchase.id"
              :shelf-id="shelfId"
              :coffee-id="coffeeId"
              :purchase="purchase"
              @edit="editPurchase(purchase)"
            />
          </ul>
        </template>
        <PurchaseSheet
          v-model:open="buying"
          :shelf-id="shelfId"
          :coffee-id="coffeeId"
          :purchases="data"
        />
        <PurchaseSheet
          v-if="editingPurchase"
          v-model:open="editingPurchaseOpen"
          :shelf-id="shelfId"
          :coffee-id="coffeeId"
          :purchases="data"
          :purchase="editingPurchase"
        />
      </template>
      <template #skeleton><CoffeePurchasesSkeleton /></template>
    </QuerySection>
  </section>
</template>
