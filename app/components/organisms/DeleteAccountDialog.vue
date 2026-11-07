<script setup lang="ts">
import { useAccountDelete, useOwnedShelves } from '~/queries/account'

const open = defineModel<boolean>('open', { default: false })
const error = ref('')
const heirs = ref<Record<string, string>>({})
const { data } = useOwnedShelves(open)
const { mutateAsync: deleteAccount, isPending } = useAccountDelete()

const shared = computed(() =>
  (data.value ?? []).filter(shelf => shelf.members.length > 0),
)
const alone = computed(() =>
  (data.value ?? []).filter(shelf => shelf.members.length === 0),
)

watch(open, isOpen => {
  if (!isOpen) return

  error.value = ''
  heirs.value = {}
})

async function remove() {
  const unchosen = shared.value.find(shelf => !heirs.value[shelf.id])

  if (unchosen) {
    error.value = `Choose who takes over ${unchosen.name}`

    return
  }

  error.value = ''

  try {
    await deleteAccount(heirs.value)
  } catch (caught) {
    const { fields, message } = serverErrors(caught)

    error.value = message || Object.values(fields)[0] || ''
  }
}
</script>

<template>
  <ConfirmDialog
    v-model:open="open"
    data-testid="delete-account"
    title="Delete your account?"
    description="Your ratings, would-buy-again verdicts and grind settings go with it, and you leave every shelf. Coffees you added to the catalog stay. This can't be undone."
    confirm="Delete account"
    :error="error"
    :pending="isPending"
    @confirm="remove"
  >
    <div v-if="shared.length > 0 || alone.length > 0" class="mt-6 grid gap-4">
      <Field
        v-for="shelf in shared"
        :key="shelf.id"
        data-testid="delete-account-heir"
      >
        <FieldLabel :for="`heir-${shelf.id}`" class="text-xs">
          Who takes over {{ shelf.name }}?
        </FieldLabel>
        <NativeSelect
          :id="`heir-${shelf.id}`"
          v-model="heirs[shelf.id]"
          class="w-full"
          :data-testid="`delete-account-heir-${shelf.id}`"
        >
          <NativeSelectOption value="">Pick a member</NativeSelectOption>
          <NativeSelectOption
            v-for="member in shelf.members"
            :key="member.id"
            :value="member.id"
          >
            {{ member.name }}
          </NativeSelectOption>
        </NativeSelect>
      </Field>
      <p
        v-if="alone.length > 0"
        class="text-xs text-primary"
        data-testid="delete-account-alone"
      >
        Nobody else is in
        {{ alone.map(shelf => shelf.name).join(', ') }}, so
        {{ alone.length === 1 ? 'it is' : 'they are' }} deleted with every bag
        and grinder on {{ alone.length === 1 ? 'it' : 'them' }}.
      </p>
    </div>
  </ConfirmDialog>
</template>
