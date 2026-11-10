<script setup lang="ts">
import { useForm } from 'vee-validate'
import { useBuyAgain, usePurchaseUpdate } from '~/queries/purchases'

const props = withDefaults(
  defineProps<{
    shelfId: string
    coffeeId: string
    purchases: ShelfPurchase[]
    purchase?: ShelfPurchase
  }>(),
  { purchase: undefined },
)

const open = defineModel<boolean>('open', { default: false })

const { mutateAsync: buyAgain } = useBuyAgain()
const { mutateAsync: updatePurchase } = usePurchaseUpdate()

const formError = ref('')

const copy = computed(() =>
  props.purchase
    ? {
        title: 'Edit purchase',
        description: 'Fix the dates, size or price of this bag.',
        submit: 'Save changes',
      }
    : {
        title: 'Buy again',
        description: 'Another bag, filled in from the last one.',
        submit: 'Add purchase',
      },
)

function startValues() {
  return props.purchase
    ? purchaseFormValues(props.purchase)
    : buyAgainValues(props.purchases)
}

const { handleSubmit, resetForm, setErrors, isSubmitting } = useForm({
  validationSchema: zodSchema(purchaseSchema),
  initialValues: startValues(),
})

watch(open, isOpen => {
  if (!isOpen) return

  formError.value = ''
  resetForm({ values: startValues() })
})

const save = handleSubmit(async purchase => {
  formError.value = ''
  const target = { shelfId: props.shelfId, coffeeId: props.coffeeId }

  try {
    if (props.purchase) {
      await updatePurchase({
        ...target,
        purchaseId: props.purchase.id,
        purchase,
      })
    } else {
      await buyAgain({ ...target, purchase })
    }

    open.value = false
  } catch (error) {
    const { fields, message } = serverErrors(error)

    setErrors(fields)
    formError.value = message
  }
})
</script>

<template>
  <FormSheet
    v-model:open="open"
    data-testid="purchase-sheet"
    :title="copy.title"
    :description="copy.description"
  >
    <form
      class="flex flex-col gap-6 px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:px-8"
      novalidate
      data-testid="purchase-form"
      @submit="save"
    >
      <LazyPurchaseFields />

      <Alert v-if="formError" variant="destructive" data-testid="form-error">
        <AlertDescription>{{ formError }}</AlertDescription>
      </Alert>

      <Button
        type="submit"
        data-testid="purchase-submit"
        :disabled="isSubmitting"
      >
        {{ copy.submit }}
      </Button>
    </form>
  </FormSheet>
</template>
