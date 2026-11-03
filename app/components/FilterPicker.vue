<script setup lang="ts">
import { CheckIcon, ChevronDownIcon } from '@lucide/vue'
import { refDebounced, useIntersectionObserver } from '@vueuse/core'
import { useFilterOptions } from '~/queries/filters'

const picked = defineModel<LibraryOption | null>({ required: true })

const props = defineProps<{
  shelfId: string
  area: FilterArea
  kind: FilterKind
  label: string
}>()

const anyOption: LibraryOption = { value: '', label: '' }
const prefix = computed(() => `${props.area}-filter`)

const open = ref(false)
const search = ref('')
const searched = refDebounced(search, 150)

const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
  useFilterOptions(
    () => props.shelfId,
    () => props.area,
    () => props.kind,
    searched,
    open,
  )
const options = computed(
  () => data.value?.pages.flatMap(page => page.options) ?? [],
)

const more = useTemplateRef<HTMLElement>('more')

function loadMore() {
  if (hasNextPage.value && !isFetchingNextPage.value) fetchNextPage()
}

useIntersectionObserver(more, ([entry]) => {
  if (entry?.isIntersecting) loadMore()
})

function pick(option: LibraryOption) {
  picked.value = option.value ? option : null
}

watch(open, isOpen => {
  if (!isOpen) search.value = ''
})
</script>

<template>
  <Combobox
    v-model:open="open"
    :model-value="picked ?? anyOption"
    by="value"
    ignore-filter
    @update:model-value="pick($event as LibraryOption)"
  >
    <ComboboxAnchor as-child>
      <ComboboxTrigger as-child>
        <button
          type="button"
          :data-testid="`${prefix}-${kind}`"
          :aria-label="picked ? `${label}: ${picked.label}` : label"
          :class="[
            'flex max-w-56 items-center gap-1.5 rounded-full border px-4 py-2 text-[12px] uppercase transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            picked
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-transparent bg-accent hover:border-primary',
          ]"
        >
          <span class="truncate">{{ picked?.label ?? label }}</span>
          <ChevronDownIcon class="size-3.5 shrink-0" aria-hidden="true" />
        </button>
      </ComboboxTrigger>
    </ComboboxAnchor>
    <ComboboxList
      align="start"
      class="w-64 rounded-[18px] p-1.5 font-mono ring-primary *:data-[slot=input-group]:w-auto"
      :data-testid="`${prefix}-${kind}-list`"
    >
      <ComboboxInput
        v-model="search"
        :placeholder="`Search ${filterPlurals[kind]}`"
        :aria-label="`Search ${filterPlurals[kind]}`"
        autocomplete="off"
        :data-testid="`${prefix}-${kind}-search`"
      />
      <ComboboxViewport>
        <ComboboxItem
          v-if="picked"
          :value="anyOption"
          class="rounded-full px-3 py-2"
          :data-testid="`${prefix}-any`"
        >
          Any {{ label.toLowerCase() }}
        </ComboboxItem>
        <ComboboxItem
          v-for="option in options"
          :key="option.value"
          :value="option"
          class="rounded-full px-3 py-2"
          :data-testid="`${prefix}-option`"
        >
          <span class="truncate">{{ option.label }}</span>
          <ComboboxItemIndicator>
            <CheckIcon aria-hidden="true" />
          </ComboboxItemIndicator>
        </ComboboxItem>
        <p
          v-if="data && !options.length"
          class="px-3 py-2 text-xs"
          :data-testid="`${prefix}-none`"
        >
          {{
            search
              ? `Nothing in ${filterAreaNames[area]} matches “${search}”.`
              : 'Nothing to pick yet.'
          }}
        </p>
        <button
          v-if="hasNextPage"
          ref="more"
          type="button"
          class="w-full rounded-full px-3 py-2 text-left text-xs uppercase hover:bg-accent"
          :disabled="isFetchingNextPage"
          :data-testid="`${prefix}-more`"
          @click="loadMore"
        >
          {{ isFetchingNextPage ? 'Loading…' : 'Show more' }}
        </button>
      </ComboboxViewport>
    </ComboboxList>
  </Combobox>
</template>
