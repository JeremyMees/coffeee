<script setup lang="ts">
import { SearchIcon } from '@lucide/vue'
import { refDebounced, useIntersectionObserver } from '@vueuse/core'
import { useCatalogPages } from '~/queries/catalog'
import { useFilterLabels } from '~/queries/filters'

useHead({ title: 'Discover · Coffeee' })

const route = useRoute('shelves-shelfId-discover')
const shelfId = computed(() => route.params.shelfId)

const labels = useFilterLabels(shelfId, labelIds(route.query))
await labels.suspense()
const initial = catalogFromRoute(route.query, labels.data.value ?? {})

const search = ref(initial.search)
const searched = refDebounced(search, 200)
const filter = ref(initial.filter)
const sort = ref<CatalogSort>(initial.sort)

const catalog = useCatalogPages(shelfId, () =>
  catalogQuery(searched.value, filter.value, sort.value),
)
await catalog.suspense()

const coffees = computed(
  () => catalog.data.value?.pages.flatMap(loaded => loaded.coffees) ?? [],
)
const narrowed = computed(
  () => Boolean(searched.value.trim()) || isCatalogFiltered(filter.value),
)

watch([searched, filter, sort], () => {
  const query = catalogRoute(searched.value, filter.value, sort.value)

  labels.remember(query, catalogLabels(filter.value))
  navigateTo({ query }, { replace: true })
})

const input = useTemplateRef<HTMLInputElement>('input')
const focus = useSearchFocus()

function focusIfAsked() {
  if (!focus.value) return

  input.value?.focus()
  focus.value = false
}

onMounted(focusIfAsked)
watch(focus, focusIfAsked, { flush: 'post' })

function clear() {
  search.value = ''
  filter.value = emptyCatalogFilter()
}

const more = useTemplateRef<HTMLElement>('more')

function loadMore() {
  if (catalog.hasNextPage.value && !catalog.isFetchingNextPage.value) {
    catalog.fetchNextPage()
  }
}

useIntersectionObserver(more, ([entry]) => {
  if (entry?.isIntersecting) loadMore()
})
</script>

<template>
  <main>
    <PageHeader title="Discover" />
    <p class="mt-3 text-xs">
      Find any coffee anyone has added, by what you remember or want to taste.
    </p>
    <label
      class="mt-6 flex max-w-2xl items-center gap-3 rounded-full border border-primary px-5 py-3 focus-within:ring-2 focus-within:ring-ring"
    >
      <SearchIcon class="size-4 shrink-0" aria-hidden="true" />
      <span class="sr-only">Search the catalog</span>
      <input
        ref="input"
        v-model="search"
        type="search"
        autocomplete="off"
        placeholder="Coffee, roaster, flavor note, origin…"
        class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        data-testid="search-input"
      />
      <kbd
        class="hidden shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] lg:inline"
        aria-hidden="true"
      >
        ⌘K
      </kbd>
    </label>
    <CatalogFilters v-model="filter" class="mt-4" :shelf-id="shelfId" />
    <p
      v-if="!coffees.length && !narrowed"
      class="mt-8 text-xs"
      data-testid="discover-empty"
    >
      Nobody has added a coffee yet.
    </p>
    <div
      v-else-if="!coffees.length"
      class="mt-8 flex flex-col items-start gap-4"
      data-testid="discover-no-match"
    >
      <p class="text-xs">
        {{
          searched.trim()
            ? `No coffee matches “${searched.trim()}”.`
            : 'No coffee matches these filters.'
        }}
      </p>
      <button
        type="button"
        data-testid="discover-no-match-clear"
        class="rounded-full border border-primary px-6 py-2.5 text-sm uppercase"
        @click="clear"
      >
        Clear search
      </button>
    </div>
    <template v-else>
      <div class="mt-8 flex flex-wrap items-center justify-between gap-3">
        <p class="text-xs uppercase" data-testid="discover-total">
          {{ catalog.data.value?.pages[0]?.total }}
          {{ catalog.data.value?.pages[0]?.total === 1 ? 'coffee' : 'coffees' }}
        </p>
        <CatalogSortPicker v-model="sort" />
      </div>
      <ul
        aria-label="Coffees"
        data-testid="discover-results"
        class="mt-3 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3"
      >
        <li v-for="coffee in coffees" :key="coffee.id">
          <CatalogResult :coffee="coffee" :to="`/coffees/${coffee.id}`" />
        </li>
      </ul>
      <button
        v-if="catalog.hasNextPage.value"
        ref="more"
        type="button"
        class="mx-auto mt-8 flex rounded-full border border-primary px-6 py-2.5 text-sm uppercase"
        :disabled="catalog.isFetchingNextPage.value"
        data-testid="discover-more"
        @click="loadMore"
      >
        {{ catalog.isFetchingNextPage.value ? 'Loading…' : 'Show more' }}
      </button>
    </template>
  </main>
</template>
