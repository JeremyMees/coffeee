<script setup lang="ts">
import { ArrowUpRightIcon, PencilIcon, Trash2Icon } from '@lucide/vue'

const props = defineProps<{
  coffee: Pick<SharedCoffee, 'id' | 'name' | 'roaster' | 'link'> & {
    roasterDetails: Pick<ShelfRoaster, 'id'>
  }
  editable: boolean
  deletable?: boolean
}>()

defineEmits<{ edit: []; delete: [] }>()

const morph = useMorph('coffee', () => props.coffee.id)
</script>

<template>
  <header class="mt-6 flex items-end justify-between gap-4">
    <div>
      <NuxtLink
        :to="`/roasters/${coffee.roasterDetails.id}`"
        class="text-xs uppercase underline-offset-4 hover:underline"
        data-testid="coffee-roaster-name"
      >
        {{ coffee.roaster }}
      </NuxtLink>
      <h1
        class="mt-2 w-fit text-[48px] lg:text-[72px]"
        :style="morph.name('name')"
        data-testid="coffee-title"
      >
        {{ coffee.name }}
      </h1>
      <a
        v-if="coffee.link"
        :href="coffee.link"
        target="_blank"
        rel="noopener noreferrer"
        data-testid="coffee-link-out"
        class="mt-2 inline-flex items-center gap-1 text-xs uppercase underline-offset-4 hover:underline"
      >
        At the roaster
        <ArrowUpRightIcon class="size-4" aria-hidden="true" />
      </a>
    </div>
    <div v-if="editable || deletable" class="mb-2 flex shrink-0 gap-2">
      <button
        v-if="deletable"
        type="button"
        data-testid="coffee-delete"
        aria-label="Delete coffee"
        title="Delete coffee"
        class="flex items-center rounded-full border border-primary p-2 transition-colors hover:bg-primary hover:text-primary-foreground"
        @click="$emit('delete')"
      >
        <Trash2Icon class="size-4" aria-hidden="true" />
      </button>
      <button
        v-if="editable"
        type="button"
        data-testid="coffee-edit"
        class="flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-xs uppercase transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
        @click="$emit('edit')"
      >
        <PencilIcon class="size-4" aria-hidden="true" />
        Edit
      </button>
    </div>
  </header>
</template>
