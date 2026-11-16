<script setup lang="ts">
import { ArrowUpRightIcon, PencilIcon, Trash2Icon } from '@lucide/vue'
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
  <header class="mt-6 flex flex-wrap items-end justify-between gap-4">
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
    <div class="mb-2 flex w-full gap-2 sm:w-auto sm:shrink-0">
      <ShareButton
        :name="coffee.name"
        :path="coffeePath(coffee)"
        class="flex-1 px-2 sm:flex-none sm:px-4"
      />
      <Button
        v-if="editable"
        type="button"
        data-testid="coffee-edit"
        variant="outline"
        size="sm"
        class="flex-1 px-2 sm:flex-none sm:px-4"
        @click="$emit('edit')"
      >
        <PencilIcon class="size-4" aria-hidden="true" />
        Edit
      </Button>
      <Button
        v-if="deletable"
        type="button"
        data-testid="coffee-delete"
        variant="destructive"
        size="sm"
        class="flex-1 px-2 sm:flex-none sm:px-4"
        @click="$emit('delete')"
      >
        <Trash2Icon class="size-4" aria-hidden="true" />
        Delete
      </Button>
    </div>
  </header>
</template>
