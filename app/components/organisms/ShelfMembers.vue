<script setup lang="ts">
import { CrownIcon, XIcon } from '@lucide/vue'
import {
  useShelfHandOver,
  useShelfMemberRemove,
  useShelfMembers,
} from '~/queries/shelves'

const props = defineProps<{ shelfId: string }>()

const user = useCurrentUser()
const listed = useShelfMembers(() => props.shelfId)

const { mutateAsync: handOver, isPending: handingOver } = useShelfHandOver()
const { mutateAsync: removeMember, isPending: removing } =
  useShelfMemberRemove()

const ownerId = computed(
  () => user.value?.shelves.find(found => found.id === props.shelfId)?.ownerId,
)
const isOwner = computed(() => ownerId.value === user.value?.id)

type Member = NonNullable<typeof listed.data.value>[number]

const asking = ref<{ action: 'handOver' | 'remove'; member: Member }>()
const open = ref(false)
const error = ref('')

const dialog = computed(() => {
  const name = asking.value?.member.name ?? ''

  return asking.value?.action === 'handOver'
    ? {
        title: `Hand the shelf to ${name}?`,
        description: `${name} becomes the shelf owner. You stay a member, but only ${name} can rename or delete the shelf and remove people from it.`,
        confirm: 'Hand over',
      }
    : {
        title: `Remove ${name}?`,
        description: `${name} no longer sees this shelf's coffee and purchases. Their ratings and grind settings stay theirs.`,
        confirm: 'Remove',
      }
})

function ask(action: 'handOver' | 'remove', member: Member) {
  asking.value = { action, member }
  error.value = ''
  open.value = true
}

async function confirm() {
  if (!asking.value) return

  const { action, member } = asking.value
  error.value = ''

  try {
    if (action === 'handOver') {
      await handOver({ shelfId: props.shelfId, ownerId: member.id })
    } else {
      await removeMember({ shelfId: props.shelfId, userId: member.id })
    }

    open.value = false
  } catch (caught) {
    error.value = serverErrors(caught).message
  }
}
</script>

<template>
  <section class="flex flex-col gap-4" data-testid="shelf-members">
    <div>
      <h2 class="text-[28px]">Members</h2>
      <p class="mt-1 text-xs">
        Everyone here sees and changes this shelf's coffee. Only the shelf owner
        can remove members or hand the shelf over.
      </p>
    </div>
    <QuerySection :query="listed" testid="shelf-members">
      <template #default="{ data: members }">
        <ul class="divide-y rounded-[18px] border text-xs">
          <li
            v-for="member in members"
            :key="member.id"
            data-testid="shelf-member"
            class="flex items-center justify-between gap-4 px-4 py-3"
          >
            <span class="min-w-0">
              <span
                class="block truncate font-sans font-semibold"
                data-testid="shelf-member-name"
              >
                {{
                  member.id === user?.id ? `${member.name} (you)` : member.name
                }}
              </span>
              <span class="block truncate">{{ member.email }}</span>
            </span>
            <span class="flex shrink-0 items-center gap-1">
              <span
                v-if="member.id === ownerId"
                data-testid="shelf-member-owner"
                class="rounded-full border px-3 py-1 text-[10px] uppercase"
              >
                Owner
              </span>
              <template v-else-if="isOwner">
                <Button
                  type="button"
                  data-testid="shelf-member-hand-over"
                  variant="ghost"
                  size="icon-sm"
                  :aria-label="`Hand the shelf to ${member.name}`"
                  @click="ask('handOver', member)"
                >
                  <CrownIcon class="size-4" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  data-testid="shelf-member-remove"
                  variant="ghost"
                  size="icon-sm"
                  :aria-label="`Remove ${member.name}`"
                  @click="ask('remove', member)"
                >
                  <XIcon class="size-4" aria-hidden="true" />
                </Button>
              </template>
            </span>
          </li>
        </ul>
      </template>
      <template #skeleton><ShelfMembersSkeleton /></template>
    </QuerySection>
    <ConfirmDialog
      v-model:open="open"
      data-testid="shelf-member-dialog"
      :title="dialog.title"
      :description="dialog.description"
      :confirm="dialog.confirm"
      :error="error"
      :pending="handingOver || removing"
      @confirm="confirm"
    />
  </section>
</template>
