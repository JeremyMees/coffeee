<script setup lang="ts">
import { LayoutGridIcon, TableIcon } from '@lucide/vue'
import type { PaginationState, SortingState } from '@tanstack/vue-table'
import { useIntersectionObserver, useMediaQuery } from '@vueuse/core'
import { useFilterLabels } from '~/queries/filters'
import { useLibraryPage, useLibraryPages } from '~/queries/library'

useHead({ title: 'Library · Coffeee' })

const route = useRoute('shelves-shelfId-library')
const shelfId = computed(() => idFrom(route.params.shelfId))
const shelf = useCurrentShelf()
const desktop = useMediaQuery('(min-width: 1024px)')

const labels = useFilterLabels(shelfId, labelIds(route.query))
await labels.suspense()
const initial = libraryFromRoute(route.query, labels.data.value ?? {})

const filter = ref(initial.filter)
const view = ref<LibraryView>(initial.view)
const sorting = ref<SortingState>(
  initial.sort
    ? [
        {
          id: initial.sort.column,
          desc: initial.sort.direction === 'descending',
        },
      ]
    : [],
)
const pagination = ref<PaginationState>({
  pageIndex: initial.pageIndex,
  pageSize: libraryPageSize,
})
const table = computed(() => desktop.value && view.value === 'table')

const sort = computed<LibrarySort | null>(() => {
  const [sorted] = sorting.value

  return sorted
    ? {
        column: sorted.id as LibraryColumn,
        direction: sorted.desc ? 'descending' : 'ascending',
      }
    : null
})

watch([filter, sorting], () => {
  pagination.value = { ...pagination.value, pageIndex: 0 }
})

watch([filter, view, sort, () => pagination.value.pageIndex], () => {
  const query = libraryRoute(
    filter.value,
    view.value,
    sort.value,
    pagination.value.pageIndex,
  )

  labels.remember(query, libraryLabels(filter.value))
  navigateTo({ query }, { replace: true })
})

const grid = useLibraryPages(
  shelfId,
  () => libraryQuery(filter.value),
  () => !table.value,
)
const page = useLibraryPage(
  shelfId,
  () => libraryQuery(filter.value, sort.value),
  () => pagination.value.pageIndex,
  table,
)
await (table.value ? page.suspense() : grid.suspense())

const cards = computed(
  () => grid.data.value?.pages.flatMap(loaded => loaded.coffees) ?? [],
)
const total = computed(() =>
  table.value
    ? (page.data.value?.total ?? 0)
    : (grid.data.value?.pages[0]?.total ?? 0),
)
const empty = computed(
  () => !isLibraryFiltered(filter.value) && total.value === 0,
)

const more = useTemplateRef<HTMLElement>('more')

function loadMore() {
  if (grid.hasNextPage.value && !grid.isFetchingNextPage.value) {
    grid.fetchNextPage()
  }
}

useIntersectionObserver(more, ([entry]) => {
  if (entry?.isIntersecting) loadMore()
})

const viewIcons = { grid: LayoutGridIcon, table: TableIcon }
</script>

<template>
  <main>
    <PageHeader title="Library" />
    <p v-if="empty" class="mt-3 text-xs" data-testid="library-empty">
      Every coffee you've bought will show up here, finished or not.
    </p>
    <template v-else>
      <div class="mt-6 flex flex-wrap items-start justify-between gap-4">
        <LibraryFilters v-model="filter" :shelf-id="shelfId" />
        <div
          v-if="desktop"
          class="flex rounded-full bg-accent p-1"
          role="group"
          aria-label="View"
          data-testid="library-view"
        >
          <button
            v-for="option in libraryViews"
            :key="option"
            type="button"
            :data-testid="`library-view-${option}`"
            :aria-pressed="view === option"
            :aria-label="option === 'grid' ? 'Grid' : 'Table'"
            :class="[
              'rounded-full p-2 transition-colors',
              view === option
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-background',
            ]"
            @click="view = option"
          >
            <component
              :is="viewIcons[option]"
              class="size-4"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
      <LibraryTable
        v-if="table"
        v-model:sorting="sorting"
        v-model:pagination="pagination"
        class="mt-8"
        :coffees="page.data.value?.coffees ?? []"
        :total="total"
        :shelf="shelf!"
      />
      <div
        v-else-if="!cards.length"
        class="mt-8 flex flex-col items-start gap-4"
        data-testid="library-no-match"
      >
        <p class="text-xs">No coffee in your library matches these filters.</p>
        <button
          type="button"
          data-testid="library-no-match-clear"
          class="rounded-full border border-primary px-6 py-2.5 text-sm uppercase"
          @click="filter = emptyLibraryFilter()"
        >
          Clear filters
        </button>
      </div>
      <template v-else>
        <ul
          aria-label="Library"
          data-testid="library"
          class="mt-8 flex flex-col lg:grid lg:grid-cols-2 lg:gap-5 2xl:grid-cols-3"
        >
          <li
            v-for="coffee in cards"
            :key="coffee.id"
            class="not-first:-mt-[216px] lg:not-first:mt-0"
          >
            <CoffeeCard
              :coffee="coffee"
              :to="shelfCoffeePath(shelf!, coffee)"
            />
          </li>
        </ul>
        <button
          v-if="grid.hasNextPage.value"
          ref="more"
          type="button"
          class="mx-auto mt-8 flex rounded-full border border-primary px-6 py-2.5 text-sm uppercase"
          :disabled="grid.isFetchingNextPage.value"
          data-testid="library-more"
          @click="loadMore"
        >
          {{ grid.isFetchingNextPage.value ? 'Loading…' : 'Show more' }}
        </button>
      </template>
    </template>
  </main>
</template>
