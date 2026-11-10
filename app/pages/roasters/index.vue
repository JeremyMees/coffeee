<script setup lang="ts">
import { refDebounced } from '@vueuse/core'
import { useRoasterPages } from '~/queries/roasters'

useHead({ title: 'Roasters · Coffeee' })

const route = useRoute()
const shelf = useCurrentShelf()
const addRoaster = useAddRoaster()
const shelfId = computed(() => shelf.value?.id ?? '')

const initial = roasterFromRoute(route.query)
const search = ref(initial.search)
const searched = refDebounced(search, 200)
const filter = ref<RoasterFilter>(initial.filter)

watch([searched, filter], () =>
  navigateTo(
    { query: roasterRoute(searched.value, filter.value) },
    { replace: true },
  ),
)

const listed = useRoasterPages(shelfId, () =>
  roasterQuery(searched.value, filter.value),
)

const roasters = computed(
  () => listed.data.value?.pages.flatMap(loaded => loaded.roasters) ?? [],
)
const total = computed(() => listed.data.value?.pages[0]?.total ?? 0)
const typed = computed(() => searched.value.trim())
const onlyBoughtFrom = computed(
  () => filter.value.boughtFrom && !filter.value.country.length && !typed.value,
)
const narrowed = computed(
  () => Boolean(typed.value) || isRoasterFiltered(filter.value),
)

function clear() {
  search.value = ''
  filter.value = emptyRoasterFilter()
}
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
    <BrowsingSearch
      v-model="search"
      class="mt-6"
      label="Search roasters"
      placeholder="Roaster, city or country…"
      short-placeholder="Search roasters"
    />
    <RoasterFilters v-model="filter" class="mt-4" :shelf-id="shelfId" />
    <QuerySection :query="listed" testid="roasters">
      <p
        v-if="!roasters.length && (!narrowed || onlyBoughtFrom)"
        class="mt-8 text-xs"
        data-testid="roasters-empty"
      >
        {{
          onlyBoughtFrom
            ? 'Your shelf has not bought from any roaster yet.'
            : 'Nobody has added a roaster yet.'
        }}
      </p>
      <div
        v-else-if="!roasters.length"
        class="mt-8 flex flex-col items-start gap-4"
        data-testid="roasters-no-match"
      >
        <p class="text-xs">
          {{
            typed
              ? `No roaster matches “${typed}”.`
              : 'No roaster matches these filters.'
          }}
        </p>
        <Button
          type="button"
          data-testid="roasters-no-match-clear"
          variant="outline"
          size="lg"
          @click="clear"
        >
          {{ typed ? 'Clear search' : 'Clear filters' }}
        </Button>
      </div>
      <template v-else>
        <p class="mt-8 text-xs uppercase" data-testid="roasters-total">
          {{ total }} {{ total === 1 ? 'roaster' : 'roasters' }}
        </p>
        <ul
          aria-label="Roasters"
          data-testid="roasters"
          class="mt-3 grid gap-3 md:grid-cols-2 2xl:grid-cols-3"
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
