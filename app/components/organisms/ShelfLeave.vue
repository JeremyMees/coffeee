<script setup lang="ts">
import {
  useShelfDelete,
  useShelfLeave,
  useShelfMembers,
} from '~/queries/shelves'

const props = defineProps<{ shelfId: string }>()

const user = useCurrentUser()
const { data, suspense } = useShelfMembers(() => props.shelfId)
await suspense()

const { mutateAsync: leave, isPending: leaving } = useShelfLeave()
const { mutateAsync: remove, isPending: deleting } = useShelfDelete()

const shelf = computed(() =>
  user.value?.shelves.find(found => found.id === props.shelfId),
)
const isOwner = computed(() => shelf.value?.ownerId === user.value?.id)
const others = computed(
  () =>
    (data.value ?? []).filter(member => member.id !== user.value?.id).length,
)
const onlyShelf = computed(() => (user.value?.shelves.length ?? 0) <= 1)
const mustHandOver = computed(() => isOwner.value && others.value > 0)

const asking = ref<'leave' | 'delete'>()
const open = ref(false)
const error = ref('')

const dialog = computed(() => {
  const name = shelf.value?.name ?? 'this shelf'
  const lost =
    'Every bag and grinder on it is deleted. Ratings, would-buy-again verdicts and grind settings stay with each person, and coffees stay in the catalog.'

  if (asking.value === 'delete') {
    return {
      title: `Delete ${name}?`,
      description:
        others.value > 0
          ? `${lost} ${others.value === 1 ? 'The other member loses' : `The ${others.value} other members lose`} it too. This can't be undone.`
          : `${lost} This can't be undone.`,
      confirm: 'Delete shelf',
    }
  }

  return {
    title: `Leave ${name}?`,
    description: isOwner.value
      ? `You're the last member, so leaving deletes the shelf. ${lost}`
      : "You no longer see this shelf's coffee and purchases. Someone on it can invite you back.",
    confirm: isOwner.value ? 'Leave and delete' : 'Leave shelf',
  }
})

function ask(action: 'leave' | 'delete') {
  asking.value = action
  error.value = ''
  open.value = true
}

async function confirm() {
  error.value = ''

  try {
    if (asking.value === 'delete') await remove(props.shelfId)
    else await leave(props.shelfId)

    open.value = false
  } catch (caught) {
    error.value = serverErrors(caught).message
  }
}
</script>

<template>
  <section class="flex flex-col gap-4" data-testid="shelf-leave">
    <div>
      <h2 class="text-[28px]">Leave or delete</h2>
      <p v-if="onlyShelf" class="mt-1 text-xs" data-testid="shelf-leave-only">
        This is your only shelf, so you can't leave or delete it. Make another
        shelf first.
      </p>
      <p
        v-else-if="mustHandOver"
        class="mt-1 text-xs"
        data-testid="shelf-leave-hand-over"
      >
        You're the shelf owner. Hand the shelf to another member before you
        leave it.
      </p>
    </div>
    <div class="flex flex-wrap gap-3">
      <Button
        variant="outline"
        class="rounded-full uppercase"
        data-testid="shelf-leave-button"
        :disabled="onlyShelf || mustHandOver"
        @click="ask('leave')"
      >
        Leave shelf
      </Button>
      <Button
        v-if="isOwner"
        variant="destructive"
        class="rounded-full uppercase"
        data-testid="shelf-delete-button"
        :disabled="onlyShelf"
        @click="ask('delete')"
      >
        Delete shelf
      </Button>
    </div>
    <ConfirmDialog
      v-model:open="open"
      data-testid="shelf-leave-dialog"
      :title="dialog.title"
      :description="dialog.description"
      :confirm="dialog.confirm"
      :error="error"
      :pending="leaving || deleting"
      @confirm="confirm"
    />
  </section>
</template>
