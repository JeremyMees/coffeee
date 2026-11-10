<script setup lang="ts">
import { usePurchaseFinish, usePurchaseRemoval } from '~/queries/purchases'

const props = defineProps<{
  shelfId: string
  coffeeId: string
  purchase: ShelfPurchase
}>()

const emit = defineEmits<{ edit: [] }>()

const confirming = ref(false)
const failure = ref('')

const { mutateAsync: finishPurchase, isPending: finishing } =
  usePurchaseFinish()
const { mutateAsync: removePurchase, isPending: removing } =
  usePurchaseRemoval()

const target = computed(() => ({
  shelfId: props.shelfId,
  coffeeId: props.coffeeId,
  purchaseId: props.purchase.id,
}))

async function attempt(action: () => Promise<unknown>) {
  failure.value = ''

  try {
    await action()
  } catch (error) {
    failure.value = serverErrors(error).message
  }
}

function finish() {
  return attempt(() => finishPurchase(target.value))
}

function remove() {
  confirming.value = false

  return attempt(() => removePurchase(target.value))
}
</script>

<template>
  <li data-testid="purchase" class="flex flex-col gap-3 p-4 text-xs">
    <div class="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
      <span data-testid="purchase-bought"
        >Bought {{ formatDate(purchase.purchasedOn) }}</span
      >
      <span data-testid="purchase-roasted">
        {{
          purchase.roastedOn
            ? `Roasted ${formatDate(purchase.roastedOn)}`
            : 'No roast date'
        }}
      </span>
      <span data-testid="purchase-size-price">
        {{ purchase.sizeGrams ? `${purchase.sizeGrams} g` : 'Size unknown' }}
        ·
        {{
          purchase.priceCents === null
            ? 'Price unknown'
            : formatPrice(purchase.priceCents)
        }}
      </span>
      <span class="uppercase sm:text-right" data-testid="purchase-status">
        {{ purchase.finishedAt ? 'Finished' : 'In stock' }}
      </span>
    </div>
    <div v-if="confirming" class="flex flex-wrap items-center gap-2">
      <span data-testid="purchase-delete-question">Delete this purchase?</span>
      <Button
        type="button"
        data-testid="purchase-delete-confirm"
        variant="quiet"
        size="pill-xs"
        class="text-destructive"
        @click="remove"
      >
        Delete
      </Button>
      <Button
        type="button"
        data-testid="purchase-delete-cancel"
        variant="quiet"
        size="pill-xs"
        @click="confirming = false"
      >
        Keep
      </Button>
    </div>
    <div v-else class="flex flex-wrap gap-2">
      <Button
        type="button"
        data-testid="purchase-edit"
        variant="quiet"
        size="pill-xs"
        @click="emit('edit')"
      >
        Edit
      </Button>
      <Button
        v-if="!purchase.finishedAt"
        type="button"
        data-testid="purchase-finish"
        variant="quiet"
        size="pill-xs"
        :disabled="finishing"
        @click="finish"
      >
        Finished
      </Button>
      <Button
        type="button"
        data-testid="purchase-delete"
        variant="quiet"
        size="pill-xs"
        :disabled="removing"
        @click="confirming = true"
      >
        Delete
      </Button>
    </div>
    <p
      v-if="failure"
      role="alert"
      class="text-destructive"
      data-testid="purchase-error"
    >
      {{ failure }}
    </p>
  </li>
</template>
