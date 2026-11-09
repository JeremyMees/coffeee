<script setup lang="ts">
import { PlusIcon } from '@lucide/vue'
import { refDebounced } from '@vueuse/core'
import { useListSearch } from '~/queries/lists'

defineOptions({ inheritAttrs: false })

const model = defineModel<OriginEntry[]>({ default: () => [] })

const props = defineProps<{
  id: string
  endpoint: string
  origins: string[]
  placeholder: string
  hint: string
  invalid?: boolean
}>()

const search = ref('')
const searched = refDebounced(search, 150)

const { data } = useListSearch<OriginListEntry>(
  () => props.endpoint,
  searched,
  () => ({ origins: props.origins.join(',') }),
)

function entryKey(entry: OriginEntry) {
  return `${entry.origin}:${nameKey(entry.name)}`
}

const key = computed(() => nameKey(search.value))
const picked = computed(() => new Set(model.value.map(entryKey)))
const found = computed(() =>
  (data.value ?? []).filter(entry => props.origins.includes(entry.origin)),
)
const entries = computed(() =>
  found.value.filter(entry => !picked.value.has(entryKey(entry))),
)
const creatable = computed(() =>
  key.value === ''
    ? []
    : props.origins.filter(origin => {
        const created = `${origin}:${key.value}`

        return (
          !picked.value.has(created) &&
          !found.value.some(entry => entryKey(entry) === created)
        )
      }),
)
const severalOrigins = computed(() => props.origins.length > 1)

const chips = computed(() =>
  model.value.map(entry => ({
    key: entryKey(entry),
    label: entry.name,
    detail: severalOrigins.value ? originName(entry.origin) : undefined,
  })),
)

function pick(event: Event, entry: OriginEntry) {
  event.preventDefault()
  model.value = [...model.value, { origin: entry.origin, name: entry.name }]
  search.value = ''
}

function remove(removed: string) {
  model.value = model.value.filter(entry => entryKey(entry) !== removed)
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <PickedChips :chips="chips" :data-testid="`${id}-chips`" @remove="remove" />
    <Combobox ignore-filter open-on-focus>
      <ComboboxAnchor>
        <ComboboxInput
          v-bind="$attrs"
          :id="id"
          v-model="search"
          :placeholder="origins.length ? placeholder : 'Pick an origin first'"
          :disabled="!origins.length"
          autocomplete="off"
          :aria-invalid="invalid ? true : undefined"
        />
      </ComboboxAnchor>
      <ComboboxList class="rounded-[18px] p-1.5 font-mono ring-primary">
        <ComboboxViewport class="max-h-64 overflow-y-auto">
          <ComboboxItem
            v-for="origin in creatable"
            :key="`new:${origin}`"
            :value="`new:${origin}`"
            data-testid="scoped-option-new"
            class="rounded-full px-3 py-2 text-primary"
            @select="pick($event, { origin, name: search.trim() })"
          >
            <PlusIcon aria-hidden="true" />
            Add “{{ search.trim() }}”{{
              severalOrigins ? ` in ${originName(origin)}` : ''
            }}
          </ComboboxItem>
          <ComboboxSeparator v-if="creatable.length && entries.length" />
          <ComboboxItem
            v-for="entry in entries"
            :key="entry.id"
            :value="entry.id"
            data-testid="scoped-option"
            class="rounded-full px-3 py-2"
            @select="pick($event, entry)"
          >
            {{ entry.name }}
            <span v-if="severalOrigins" class="text-muted-foreground">
              · {{ originName(entry.origin) }}
            </span>
          </ComboboxItem>
          <p
            v-if="!entries.length && !creatable.length"
            data-testid="scoped-hint"
            class="px-3 py-2 text-xs"
          >
            {{ hint }}
          </p>
        </ComboboxViewport>
      </ComboboxList>
    </Combobox>
  </div>
</template>
