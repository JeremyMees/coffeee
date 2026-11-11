<script setup lang="ts">
import {
  CheckIcon,
  ChevronsUpDownIcon,
  PlusIcon,
  SettingsIcon,
} from '@lucide/vue'
import type { DropdownMenuContentProps } from 'reka-ui'

defineOptions({ inheritAttrs: false })

defineProps<{
  side?: DropdownMenuContentProps['side']
  align?: DropdownMenuContentProps['align']
}>()

const route = useRoute()
const user = useCurrentUser()
const current = useCurrentShelf()

function pathOn(shelf: { id: string; name: string }) {
  const segment = 'shelfId' in route.params ? route.params.shelfId : undefined

  return segment
    ? route.path.replace(`/shelves/${segment}`, shelfPath(shelf))
    : shelfPath(shelf)
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button
        data-testid="shelf-switcher"
        v-bind="$attrs"
        type="button"
        class="flex min-w-0 items-center gap-2 rounded-full border border-primary px-4 py-2 text-[13px] uppercase hover:bg-accent"
      >
        <span class="sr-only">Shelf: </span>
        <span class="truncate">{{ current?.name }}</span>
        <ChevronsUpDownIcon
          class="ml-auto size-3.5 shrink-0"
          aria-hidden="true"
        />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      :side="side"
      :align="align"
      data-testid="shelf-menu"
      class="min-w-56 rounded-[18px] p-1.5 font-mono ring-primary"
    >
      <DropdownMenuLabel class="text-xs uppercase">Shelves</DropdownMenuLabel>
      <DropdownMenuItem
        v-for="shelf in user?.shelves"
        :key="shelf.id"
        class="rounded-full px-3 py-2"
        as-child
      >
        <NuxtLink
          :to="pathOn(shelf)"
          :aria-current="shelf.id === current?.id ? 'page' : undefined"
          data-testid="shelf-menu-shelf"
        >
          <span class="flex-1 truncate">{{ shelf.name }}</span>
          <CheckIcon v-if="shelf.id === current?.id" aria-hidden="true" />
        </NuxtLink>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem v-if="current" class="rounded-full px-3 py-2" as-child>
        <NuxtLink
          :to="`${shelfPath(current)}/settings`"
          data-testid="shelf-menu-settings"
        >
          <SettingsIcon aria-hidden="true" />
          Shelf settings
        </NuxtLink>
      </DropdownMenuItem>
      <DropdownMenuItem class="rounded-full px-3 py-2" as-child>
        <NuxtLink to="/shelves/new" data-testid="shelf-menu-new">
          <PlusIcon aria-hidden="true" />
          New shelf
        </NuxtLink>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
