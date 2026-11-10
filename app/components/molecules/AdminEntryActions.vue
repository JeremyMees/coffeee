<script setup lang="ts">
import { EllipsisIcon } from '@lucide/vue'

defineProps<{ entry: AdminEntry }>()

const emit = defineEmits<{ act: [action: AdminEntryAction] }>()

const actions: { action: AdminEntryAction; label: string }[] = [
  { action: 'update', label: 'Update' },
  { action: 'merge', label: 'Merge' },
  { action: 'delete', label: 'Delete' },
]
</script>

<template>
  <div class="flex justify-end">
    <div class="hidden gap-1 sm:flex">
      <button
        v-for="item in actions"
        :key="item.action"
        type="button"
        :data-testid="`admin-entry-${item.action}`"
        :aria-label="`${item.label} ${entry.name}`"
        class="rounded-full px-3 py-1.5 uppercase transition-colors hover:bg-accent"
        @click="emit('act', item.action)"
      >
        {{ item.label }}
      </button>
    </div>
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <button
          type="button"
          data-testid="admin-entry-menu"
          :aria-label="`Actions for ${entry.name}`"
          class="grid size-11 place-items-center rounded-full transition-colors hover:bg-accent data-[state=open]:bg-accent sm:hidden"
        >
          <EllipsisIcon class="size-4" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        data-testid="admin-entry-menu-content"
        class="min-w-40 rounded-[18px] p-1.5 font-mono ring-primary"
      >
        <DropdownMenuItem
          v-for="item in actions"
          :key="item.action"
          :data-testid="`admin-entry-menu-${item.action}`"
          :variant="item.action === 'delete' ? 'destructive' : 'default'"
          class="min-h-11 rounded-full px-4 text-[13px] uppercase"
          @select="emit('act', item.action)"
        >
          {{ item.label }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
