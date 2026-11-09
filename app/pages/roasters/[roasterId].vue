<script setup lang="ts">
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  BookmarkIcon,
  PencilIcon,
} from '@lucide/vue'
import { onlineManager } from '@tanstack/vue-query'
import { useCatalogPages } from '~/queries/catalog'
import { useRoaster } from '~/queries/roasters'

const route = useRoute('roasters-roasterId')
const roasterId = computed(() => idFrom(route.params.roasterId))
const shelf = useCurrentShelf()
const shelfId = computed(() => shelf.value?.id ?? '')

const { link: back, back: goBack } = useBackLink({
  label: 'Roasters',
  to: '/roasters',
})
const morph = useMorph('roaster', roasterId)
morph.open()

const editing = ref(false)
const mine = ref(false)

const roasterQuery = useRoaster(roasterId)
const { data: roaster, error } = roasterQuery

const catalog = useCatalogPages(
  shelfId,
  () => ({
    roasterId: roasterId.value,
    ...(mine.value && { mine: 'true' }),
  }),
  { clientOnly: true },
)

function showMissing(failure: unknown) {
  if ((failure as { statusCode?: number } | null)?.statusCode === 404) {
    showError({ statusCode: 404, statusMessage: 'Roaster not found' })
  }
}

useCanonicalSlug(
  'roasters',
  () => route.params.roasterId,
  () => roaster.value,
)

useHead({ title: () => `${roaster.value?.name ?? 'Roaster'} · Coffeee` })

function coffeesIn(data: { pages: CatalogPage[] }) {
  return data.pages.flatMap(loaded => loaded.coffees)
}

await (onlineManager.isOnline() ? roasterQuery.suspense() : undefined)
showMissing(error.value)
watch(error, showMissing)
</script>

<template>
  <main v-if="shelf" class="max-w-2xl">
    <NuxtLink
      :to="back.to"
      data-testid="roaster-back"
      class="mt-6 inline-flex items-center gap-2 text-xs uppercase lg:mt-10"
      @click="goBack"
    >
      <ArrowLeftIcon class="size-4" aria-hidden="true" />
      {{ back.label }}
    </NuxtLink>
    <header class="mt-6 flex items-end justify-between gap-4">
      <div v-if="roaster" class="flex min-w-0 items-center gap-4">
        <RoasterLogoImage
          :roaster="roaster"
          class="size-20"
          :style="morph.name('logo')"
        />
        <div class="min-w-0">
          <h1
            class="w-fit text-[40px] leading-none lg:text-[56px]"
            :style="morph.name('name')"
            data-testid="roaster-title"
          >
            {{ roaster.name }}
          </h1>
          <p
            v-if="roasterPlace(roaster)"
            class="mt-2 text-xs"
            data-testid="roaster-place"
          >
            {{ roasterPlace(roaster) }}
          </p>
          <a
            v-if="roaster.website"
            :href="referredLink(roaster.website)"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="roaster-website"
            class="mt-1 inline-flex items-center gap-1 text-xs uppercase underline-offset-4 hover:underline"
          >
            {{ websiteHost(roaster.website) }}
            <ArrowUpRightIcon class="size-4" aria-hidden="true" />
          </a>
        </div>
      </div>
      <template v-else>
        <h1 class="sr-only" data-testid="roaster-title-placeholder">Roaster</h1>
        <QuerySection :query="roasterQuery" testid="roaster">
          <template #skeleton><LazyRoasterHeaderSkeleton /></template>
        </QuerySection>
      </template>
      <button
        v-if="roaster?.canEdit"
        type="button"
        data-testid="roaster-edit"
        class="mb-2 flex shrink-0 items-center gap-2 rounded-full border border-primary px-4 py-2 text-xs uppercase transition-colors hover:bg-primary hover:text-primary-foreground"
        @click="editing = true"
      >
        <PencilIcon class="size-4" aria-hidden="true" />
        Edit
      </button>
    </header>
    <section class="mt-10">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <h2 class="text-[28px]">Coffees</h2>
        <button
          type="button"
          data-testid="roaster-filter-mine"
          :aria-pressed="mine"
          :class="[
            'flex items-center gap-1.5 rounded-full border px-4 py-2 text-[12px] uppercase transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            mine
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-transparent bg-accent hover:border-primary',
          ]"
          @click="mine = !mine"
        >
          <BookmarkIcon
            :class="['size-3.5', mine && 'fill-current']"
            aria-hidden="true"
          />
          Mine
        </button>
      </div>
      <QuerySection :query="catalog" testid="roaster-coffees">
        <template #default="{ data }">
          <p
            v-if="!coffeesIn(data).length"
            class="mt-4 text-xs"
            data-testid="roaster-coffees-empty"
          >
            {{
              mine
                ? 'Your shelf has not bought a coffee from this roaster yet.'
                : 'Nobody has added a coffee from this roaster yet.'
            }}
          </p>
          <template v-else>
            <ul
              aria-label="Coffees"
              data-testid="roaster-coffees"
              class="mt-4 flex flex-col gap-3"
            >
              <li v-for="coffee in coffeesIn(data)" :key="coffee.id">
                <CatalogResult
                  :coffee="coffee"
                  :to="catalogCoffeePath(shelf, coffee)"
                />
              </li>
            </ul>
            <LoadMore :pages="catalog" data-testid="roaster-coffees-more" />
          </template>
        </template>
        <template #skeleton><RoasterCoffeesSkeleton /></template>
      </QuerySection>
    </section>
    <EditRoasterSheet
      v-if="roaster?.canEdit"
      v-model:open="editing"
      :roaster="roaster"
    />
  </main>
</template>
