<script setup lang="ts">
import { HeartIcon, LayoutGridIcon, TableIcon } from '@lucide/vue'
import type { PaginationState, SortingState } from '@tanstack/vue-table'
import { refDebounced, useMediaQuery } from '@vueuse/core'
import { useLibraryPage, useLibraryPages } from '~/queries/library'

useHead({ title: 'Library · Coffeee' })

const route = useRoute('shelves-shelfId-library')
const shelfId = computed(() => idFrom(route.params.shelfId))
const shelf = useCurrentShelf()
const desktop = useMediaQuery('(min-width: 1024px)')

const address = useBrowsingAddress(shelfId, libraryAddress)
const initial = await address.start()

const search = ref(initial.search)
const searched = refDebounced(search, 200)
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

watch([searched, filter, sorting], () => {
  pagination.value = { ...pagination.value, pageIndex: 0 }
})

watch([searched, filter, view, sort, () => pagination.value.pageIndex], () =>
  address.keep({
    search: searched.value,
    filter: filter.value,
    view: view.value,
    sort: sort.value,
    pageIndex: pagination.value.pageIndex,
  }),
)

const grid = useLibraryPages(
  shelfId,
  () => libraryQuery(searched.value, filter.value),
  () => !table.value,
)
const page = useLibraryPage(
  shelfId,
  () => libraryQuery(searched.value, filter.value, sort.value),
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
const narrowed = computed(
  () => Boolean(searched.value.trim()) || isLibraryFiltered(filter.value),
)
const empty = computed(() => !narrowed.value && total.value === 0)

function clear() {
  search.value = ''
  filter.value = emptyLibraryFilter()
}

const favourites = {
  key: 'favourites',
  label: 'Favourites',
  icon: HeartIcon,
} as const
const viewIcons = { grid: LayoutGridIcon, table: TableIcon }
</script>

<template>
  <main>
    <PageHeader title="Library" />
    <p v-if="empty" class="mt-3 text-xs" data-testid="library-empty">
      Every coffee you've bought will show up here, finished or not.
    </p>
    <template v-else>
      <BrowsingSearch
        v-model="search"
        class="mt-6"
        label="Search your library"
        placeholder="Coffee, roaster, flavor note, origin…"
      />
      <div class="mt-4 flex flex-wrap items-start justify-between gap-4">
        <BrowsingFilters
          v-model="filter"
          :shelf-id="shelfId"
          area="library"
          :toggle="favourites"
        />
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
      <div
        v-if="!total"
        class="mt-8 flex flex-col items-start gap-4"
        data-testid="library-no-match"
      >
        <p class="text-xs">
          {{
            searched.trim()
              ? `No coffee in your library matches “${searched.trim()}”.`
              : 'No coffee in your library matches these filters.'
          }}
        </p>
        <div class="flex flex-wrap gap-3">
          <NuxtLink
            :to="discoverLink(shelf!, searched, filter)"
            data-testid="library-no-match-discover"
            class="rounded-full bg-primary px-6 py-2.5 text-sm text-primary-foreground uppercase"
          >
            {{
              searched.trim()
                ? `Search Discover for “${searched.trim()}”`
                : 'Look in Discover'
            }}
          </NuxtLink>
          <button
            type="button"
            data-testid="library-no-match-clear"
            class="rounded-full border border-primary px-6 py-2.5 text-sm uppercase"
            @click="clear"
          >
            {{ searched.trim() ? 'Clear search' : 'Clear filters' }}
          </button>
        </div>
      </div>
      <LibraryTable
        v-else-if="table"
        v-model:sorting="sorting"
        v-model:pagination="pagination"
        class="mt-8"
        :coffees="page.data.value?.coffees ?? []"
        :total="total"
        :shelf="shelf!"
      />
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
        <LoadMore :pages="grid" data-testid="library-more" />
      </template>
    </template>
  </main>
</template>
