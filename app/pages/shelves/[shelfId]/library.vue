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
const { initial } = address

const search = ref(initial.search)
const searched = refDebounced(search, 200)
const filter = ref(initial.filter)
const scope = ref<LibraryScope>(initial.scope)
const view = ref<LibraryView>(initial.view)
const sort = ref<LibrarySort | null>(initial.sort)
const pagination = ref<PaginationState>({
  pageIndex: initial.pageIndex,
  pageSize: libraryPageSize,
})
const table = computed(() => desktop.value && view.value === 'table')
const bought = computed(() => scope.value === 'bought')

const sorting = computed<SortingState>({
  get: () =>
    sort.value
      ? [
          {
            id: sort.value.column,
            desc: sort.value.direction === 'descending',
          },
        ]
      : [],
  set: ([sorted]) => {
    sort.value = sorted
      ? {
          column: sorted.id as LibrarySortBy,
          direction: sorted.desc ? 'descending' : 'ascending',
        }
      : null
  },
})

watch(scope, picked => {
  sort.value = sortIn(picked, sort.value)
})

address.whenNamed(named => {
  filter.value = named
})

const listed = computed(() =>
  JSON.stringify(libraryQuery(searched.value, filter.value, scope.value)),
)

watch([listed, sort], () => {
  pagination.value = { ...pagination.value, pageIndex: 0 }
})

watch(
  [searched, filter, scope, view, sort, () => pagination.value.pageIndex],
  () =>
    address.keep({
      search: searched.value,
      filter: filter.value,
      scope: scope.value,
      view: view.value,
      sort: sort.value,
      pageIndex: pagination.value.pageIndex,
    }),
)

const query = () =>
  libraryQuery(searched.value, filter.value, scope.value, sort.value)

const grid = useLibraryPages(shelfId, query, () => !table.value)
const page = useLibraryPage(
  shelfId,
  query,
  () => pagination.value.pageIndex,
  table,
)
const list = computed<QueryState<unknown>>(() => (table.value ? page : grid))

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

const box = useTemplateRef('box')
const focus = useSearchFocus()

function focusIfAsked() {
  if (!focus.value) return

  box.value?.focus()
  focus.value = false
}

onMounted(focusIfAsked)
watch(focus, focusIfAsked, { flush: 'post' })

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
    <p class="mt-3 text-xs">
      Every coffee anyone has added. Switch to Bought to see only what your
      shelf has had.
    </p>
    <div class="mt-6 flex flex-col gap-4 md:flex-row md:items-center">
      <div class="flex flex-wrap items-center gap-3 md:order-last">
        <LibraryScopeSwitch v-model="scope" />
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
      <BrowsingSearch
        ref="box"
        v-model="search"
        class="md:flex-1"
        label="Search the library"
        placeholder="Coffee, roaster, flavor note, origin…"
        short-placeholder="Search coffees"
        shortcut
      />
    </div>
    <div class="mt-4">
      <QuerySection :query="address.labels" testid="library-filters">
        <BrowsingFilters
          v-model="filter"
          :shelf-id="shelfId"
          :area="bought ? 'library' : 'catalog'"
          testid="library"
          :toggle="favourites"
        />

        <template #skeleton><LazyBrowsingFiltersSkeleton /></template>
      </QuerySection>
    </div>
    <QuerySection :query="list" testid="library">
      <div
        v-if="!total && !narrowed"
        class="mt-8 flex flex-col items-start gap-4"
        data-testid="library-empty"
      >
        <template v-if="bought">
          <p class="text-xs">
            Every coffee you've bought will show up here, finished or not.
          </p>
          <Button
            type="button"
            data-testid="library-empty-all"
            @click="scope = 'all'"
          >
            See all coffees
          </Button>
        </template>
        <p v-else class="text-xs">Nobody has added a coffee yet.</p>
      </div>
      <div
        v-else-if="!total"
        class="mt-8 flex flex-col items-start gap-4"
        data-testid="library-no-match"
      >
        <p class="text-xs">
          {{
            searched.trim()
              ? `No ${bought ? 'coffee you bought' : 'coffee'} matches “${searched.trim()}”.`
              : `No ${bought ? 'coffee you bought' : 'coffee'} matches these filters.`
          }}
        </p>
        <div class="flex flex-wrap gap-3">
          <Button
            v-if="bought"
            type="button"
            data-testid="library-no-match-all"
            @click="scope = 'all'"
          >
            {{
              searched.trim()
                ? `Search all coffees for “${searched.trim()}”`
                : 'Look in all coffees'
            }}
          </Button>
          <Button
            type="button"
            data-testid="library-no-match-clear"
            variant="outline"
            size="lg"
            @click="clear"
          >
            {{ searched.trim() ? 'Clear search' : 'Clear filters' }}
          </Button>
        </div>
      </div>
      <template v-else>
        <div class="mt-8 flex flex-wrap items-center justify-between gap-3">
          <p class="text-xs uppercase" data-testid="library-total">
            {{ total }} {{ total === 1 ? 'coffee' : 'coffees' }}
          </p>
          <LibrarySortPicker v-if="!table" v-model="sort" :scope="scope" />
        </div>
        <LazyLibraryTable
          v-if="table"
          v-model:sorting="sorting"
          v-model:pagination="pagination"
          class="mt-3"
          :coffees="page.data.value?.coffees ?? []"
          :total="total"
          :shelf="shelf!"
          :scope="scope"
        />
        <template v-else>
          <ul
            aria-label="Library"
            data-testid="library"
            class="mt-3 grid gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3"
          >
            <li v-for="coffee in cards" :key="coffee.id">
              <LazyCatalogResult
                :coffee="coffee"
                :to="catalogCoffeePath(shelf!, coffee)"
                :hide-bought="bought"
              />
            </li>
          </ul>
          <LazyLoadMore :pages="grid" data-testid="library-more" />
        </template>
      </template>

      <template #skeleton>
        <LazyLibraryTableSkeleton v-if="table" />
        <LazyLibrarySkeleton v-else />
      </template>
    </QuerySection>
  </main>
</template>
