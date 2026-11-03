<script setup lang="ts">
import { useAdminEntryDelete } from '~/queries/admin'

const props = defineProps<{ list: AdminList; entry: AdminEntry }>()

const open = defineModel<boolean>('open', { default: false })
const error = ref('')
const nouns = computed(() => adminListNouns[props.list])
const { mutateAsync: deleteEntry, isPending } = useAdminEntryDelete()

const description = computed(() =>
  props.list === 'coffees'
    ? `Every shelf loses its bags of it, with ratings and grind settings. This can't be undone.`
    : `It disappears from every coffee that uses it. This can't be undone.`,
)

watch(open, isOpen => {
  if (isOpen) error.value = ''
})

async function remove() {
  error.value = ''

  try {
    await deleteEntry({ list: props.list, entryId: props.entry.id })

    open.value = false
  } catch (caught) {
    error.value = serverErrors(caught).message
  }
}
</script>

<template>
  <ConfirmDialog
    v-model:open="open"
    data-testid="admin-delete"
    :title="`Delete ${entry.name}?`"
    :description="description"
    :confirm="`Delete ${nouns.one}`"
    :error="error"
    :pending="isPending"
    @confirm="remove"
  />
</template>
