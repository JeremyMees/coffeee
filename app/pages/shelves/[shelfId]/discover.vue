<script setup lang="ts">
import { refDebounced } from '@vueuse/core'
import { useCatalogPages } from '~/queries/catalog'

useHead({ title: 'Discover · Coffeee' })

const route = useRoute('shelves-shelfId-discover')
const shelfId = computed(() => idFrom(route.params.shelfId))
const shelf = useCurrentShelf()

const address = useBrowsingAddress(shelfId, catalogAddress)
const { initial } = address

const search = ref(initial.search)
const searched = refDebounced(search, 200)
const filter = ref(initial.filter)
const sort = ref<CatalogSort>(initial.sort)

address.whenNamed(named => {
  filter.value = named
})

const catalog = useCatalogPages(shelfId, () =>
  catalogQuery(searched.value, filter.value, sort.value),
)

const coffees = computed(
  () => catalog.data.value?.pages.flatMap(loaded => loaded.coffees) ?? [],
)
const narrowed = computed(
  () => Boolean(searched.value.trim()) || isBrowsingFiltered(filter.value),
)

watch([searched, filter, sort], () =>
  address.keep({
    search: searched.value,
    filter: filter.value,
    sort: sort.value,
  }),
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
  filter.value = emptyBrowsingFilter()
}
</script>

<template>
  <main>
    <PageHeader title="Discover" />
    <p class="mt-3 text-xs">
      Find any coffee anyone has added, by what you remember or want to taste.
    </p>
    <BrowsingSearch
      ref="box"
      v-model="search"
      class="mt-6"
      label="Search the catalog"
      placeholder="Coffee, roaster, flavor note, origin…"
      shortcut
    />
    <div class="mt-4">
      <QuerySection :query="address.labels" testid="discover-filters">
        <BrowsingFilters v-model="filter" :shelf-id="shelfId" area="catalog" />

        <template #skeleton><LazyBrowsingFiltersSkeleton /></template>
      </QuerySection>
    </div>
    <QuerySection :query="catalog" testid="discover">
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
            {{
              catalog.data.value?.pages[0]?.total === 1 ? 'coffee' : 'coffees'
            }}
          </p>
          <CatalogSortPicker v-model="sort" />
        </div>
        <ul
          aria-label="Coffees"
          data-testid="discover-results"
          class="mt-3 grid gap-3 md:grid-cols-2 2xl:grid-cols-3"
        >
          <li v-for="coffee in coffees" :key="coffee.id">
            <CatalogResult
              :coffee="coffee"
              :to="catalogCoffeePath(shelf!, coffee)"
            />
          </li>
        </ul>
        <LoadMore :pages="catalog" data-testid="discover-more" />
      </template>

      <template #skeleton><DiscoverSkeleton /></template>
    </QuerySection>
  </main>
</template>
