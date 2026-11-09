<script setup lang="ts">
import { useAdminEntryCreate } from '~/queries/admin'

const open = defineModel<boolean>('open', { default: false })
const { mutateAsync: createEntry } = useAdminEntryCreate()

async function add(details: CoffeeDetails) {
  const added = await createEntry({ list: 'coffees', body: details })

  return added.id
}
</script>

<template>
  <CoffeeFormSheet
    v-model:open="open"
    prefix="admin-add-coffee"
    title="Add coffee"
    description="Add it to the catalog without a bag on any shelf."
    submit-label="Add coffee"
    :send="add"
  />
</template>
