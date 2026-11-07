<script setup lang="ts">
import { useCoffeeDelete } from '~/queries/coffees'

const props = defineProps<{ coffee: Pick<SharedCoffee, 'id' | 'name'> }>()

const emit = defineEmits<{ deleted: [] }>()

const open = defineModel<boolean>('open', { default: false })
const error = ref('')
const { mutateAsync: deleteCoffee, isPending } = useCoffeeDelete()

watch(open, isOpen => {
  if (isOpen) error.value = ''
})

async function remove() {
  error.value = ''

  try {
    await deleteCoffee(props.coffee.id)

    open.value = false
    emit('deleted')
  } catch (caught) {
    error.value = serverErrors(caught).message
  }
}
</script>

<template>
  <ConfirmDialog
    v-model:open="open"
    data-testid="delete-coffee"
    :title="`Delete ${coffee.name}?`"
    description="It disappears from the catalog with all your bags, ratings and grind settings. This can't be undone."
    confirm="Delete coffee"
    :error="error"
    :pending="isPending"
    @confirm="remove"
  />
</template>
