<script setup lang="ts">
import { refDebounced } from '@vueuse/core'
import { CopyCheckIcon } from '@lucide/vue'
import { useFieldValue } from 'vee-validate'
import { useCoffeeMatch } from '~/queries/coffees'

const props = defineProps<{ shelfId: string }>()

const emit = defineEmits<{ pick: [coffee: CoffeeMatch] }>()

const name = useFieldValue<string | undefined>('name')
const roaster = useFieldValue<string | undefined>('roaster')

const typed = computed(() => ({
  name: name.value?.trim() ?? '',
  roaster: roaster.value?.trim() ?? '',
}))
const search = refDebounced(typed, 300)

const { data } = useCoffeeMatch(() => props.shelfId, search)

const match = computed(() => {
  const found = data.value?.coffee

  return found &&
    nameKey(found.name) === nameKey(typed.value.name) &&
    nameKey(found.roaster) === nameKey(typed.value.roaster)
    ? found
    : null
})

const copy = computed(() => {
  if (!match.value) return null

  const { name, roaster, inStock, onShelf } = match.value
  const coffee = `${name} by ${roaster}`

  if (inStock) {
    return {
      title: 'Already on your shelf',
      body: `${coffee} is still in stock. Bought another bag?`,
      action: 'Add another bag',
    }
  }

  if (onShelf) {
    return {
      title: 'You’ve had this one before',
      body: `${coffee} is already on this shelf. Add your new bag to it.`,
      action: 'Add a bag',
    }
  }

  return {
    title: 'Already in the catalog',
    body: `${coffee} is already in the catalog, so there’s no need to fill in its details. Just add your bag.`,
    action: 'Add a bag',
  }
})
</script>

<template>
  <Notice
    v-if="match && copy"
    :title="copy.title"
    :icon="CopyCheckIcon"
    testid="coffee-match"
  >
    {{ copy.body }}
    <template #action>
      <Button
        type="button"
        size="sm"
        data-testid="coffee-match-pick"
        @click="emit('pick', match)"
      >
        {{ copy.action }}
      </Button>
    </template>
  </Notice>
</template>
