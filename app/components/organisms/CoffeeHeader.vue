<script setup lang="ts">
import {
  ArrowUpRightIcon,
  EllipsisIcon,
  PencilIcon,
  Trash2Icon,
} from '@lucide/vue'
import { NuxtLink } from '#components'

const props = defineProps<{
  coffee: Pick<SharedCoffee, 'id' | 'name' | 'roaster'> & {
    link?: string | null
  }
  roasterId?: string
  editable?: boolean
  deletable?: boolean
}>()

defineEmits<{ edit: []; delete: [] }>()

const morph = useMorph('coffee', () => props.coffee.id)
</script>

<template>
  <header class="mt-6 flex items-end justify-between gap-4">
    <div>
      <component
        :is="roasterId ? NuxtLink : 'span'"
        :to="roasterId && roasterPath({ id: roasterId, name: coffee.roaster })"
        class="hit-area block w-fit text-xs uppercase underline-offset-4 hover:underline"
        data-testid="coffee-roaster-name"
      >
        {{ coffee.roaster }}
      </component>
      <h1
        class="mt-2 w-fit text-[48px] lg:text-[72px]"
        :style="morph.name('name')"
        data-testid="coffee-title"
      >
        {{ coffee.name }}
      </h1>
      <a
        v-if="coffee.link"
        :href="referredLink(coffee.link)"
        target="_blank"
        rel="noopener noreferrer"
        data-testid="coffee-link-out"
        class="hit-area mt-2 inline-flex items-center gap-1 text-xs uppercase underline-offset-4 hover:underline"
      >
        At the roaster
        <ArrowUpRightIcon class="size-4" aria-hidden="true" />
      </a>
    </div>
    <div v-if="editable || deletable" class="mb-2 flex shrink-0 gap-2">
      <Button
        v-if="editable"
        type="button"
        data-testid="coffee-edit"
        variant="line"
        size="pill-sm"
        @click="$emit('edit')"
      >
        <PencilIcon class="size-4" aria-hidden="true" />
        Edit
      </Button>
      <DropdownMenu v-if="deletable">
        <DropdownMenuTrigger as-child>
          <Button
            type="button"
            data-testid="coffee-more"
            aria-label="More actions"
            title="More actions"
            variant="line"
            size="icon-pill-sm"
          >
            <EllipsisIcon class="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          data-testid="coffee-more-menu"
          class="w-auto min-w-48 rounded-[22px] p-1.5 font-mono ring-primary"
        >
          <DropdownMenuItem
            variant="destructive"
            data-testid="coffee-delete"
            class="min-h-11 rounded-full px-4 text-[13px] uppercase"
            @select="$emit('delete')"
          >
            <Trash2Icon aria-hidden="true" />
            Delete coffee
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </header>
</template>
