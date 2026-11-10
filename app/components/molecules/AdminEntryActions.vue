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
      <Button
        v-for="item in actions"
        :key="item.action"
        type="button"
        :data-testid="`admin-entry-${item.action}`"
        :aria-label="`${item.label} ${entry.name}`"
        variant="ghost"
        size="pill-xs"
        class="text-xs"
        @click="emit('act', item.action)"
      >
        {{ item.label }}
      </Button>
    </div>
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button
          type="button"
          data-testid="admin-entry-menu"
          :aria-label="`Actions for ${entry.name}`"
          variant="ghost"
          size="icon-pill-sm"
          class="size-11 sm:hidden"
        >
          <EllipsisIcon class="size-4" aria-hidden="true" />
        </Button>
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
