<script setup lang="ts">
import { StoreIcon } from '@lucide/vue'
import { useRoasterPages } from '~/queries/roasters'

useHead({ title: 'Roasters · Coffeee' })

const shelf = useCurrentShelf()
const addRoaster = useAddRoaster()
const shelfId = computed(() => shelf.value?.id ?? '')
const boughtFrom = ref(false)

const listed = useRoasterPages(shelfId, (): Record<string, string> =>
  boughtFrom.value ? { boughtFrom: 'true' } : {},
)

const roasters = computed(
  () => listed.data.value?.pages.flatMap(loaded => loaded.roasters) ?? [],
)
const total = computed(() => listed.data.value?.pages[0]?.total ?? 0)
</script>

<template>
  <main>
    <PageHeader
      title="Roasters"
      add-label="Add roaster"
      @add="addRoaster = true"
    />
    <p class="mt-3 text-xs">
      Every roastery anyone has added, and the ones your shelf buys from.
    </p>
    <div
      class="mt-6 flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Filters"
    >
      <button
        type="button"
        data-testid="roasters-filter-bought-from"
        :aria-pressed="boughtFrom"
        :class="[
          'flex items-center gap-1.5 rounded-full border px-4 py-2 text-[12px] uppercase transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          boughtFrom
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-transparent bg-accent hover:border-primary',
        ]"
        @click="boughtFrom = !boughtFrom"
      >
        <StoreIcon class="size-3.5" aria-hidden="true" />
        Bought from
      </button>
    </div>
    <QuerySection :query="listed" testid="roasters">
      <p
        v-if="!roasters.length"
        class="mt-8 text-xs"
        data-testid="roasters-empty"
      >
        {{
          boughtFrom
            ? 'Your shelf has not bought from any roaster yet.'
            : 'Nobody has added a roaster yet.'
        }}
      </p>
      <template v-else>
        <p class="mt-8 text-xs uppercase" data-testid="roasters-total">
          {{ total }} {{ total === 1 ? 'roaster' : 'roasters' }}
        </p>
        <ul
          aria-label="Roasters"
          data-testid="roasters"
          class="mt-3 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3"
        >
          <li v-for="roaster in roasters" :key="roaster.id">
            <RoasterResult :roaster="roaster" />
          </li>
        </ul>
        <LoadMore :pages="listed" data-testid="roasters-more" />
      </template>

      <template #skeleton><RoastersSkeleton /></template>
    </QuerySection>
  </main>
</template>
