<script setup lang="ts">
import { PlusIcon } from '@lucide/vue'
import { refDebounced } from '@vueuse/core'
import { useListSearch } from '~/queries/lists'

defineOptions({ inheritAttrs: false })

const model = defineModel<string[]>({ default: () => [] })

const props = defineProps<{
  id: string
  endpoint: string
  placeholder: string
  hint: string
  invalid?: boolean
}>()

const search = ref('')
const searched = refDebounced(search, 150)

const { data } = useListSearch(() => props.endpoint, searched)

const key = computed(() => nameKey(search.value))
const picked = computed(() => new Set(model.value.map(nameKey)))
const found = computed(() => data.value ?? [])
const entries = computed(() =>
  found.value.filter(entry => !picked.value.has(nameKey(entry.name))),
)
const canCreate = computed(
  () =>
    key.value !== '' &&
    !picked.value.has(key.value) &&
    !found.value.some(entry => nameKey(entry.name) === key.value),
)

const chips = computed(() =>
  model.value.map(name => ({ key: nameKey(name), label: name })),
)

function pick(event: Event, name: string) {
  event.preventDefault()
  model.value = [...model.value, name]
  search.value = ''
}

function remove(removed: string) {
  model.value = model.value.filter(name => nameKey(name) !== removed)
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
          :placeholder="placeholder"
          autocomplete="off"
          :aria-invalid="invalid ? true : undefined"
        />
      </ComboboxAnchor>
      <ComboboxList class="rounded-[18px] p-1.5 font-mono ring-primary">
        <ComboboxViewport class="max-h-64 overflow-y-auto">
          <ComboboxItem
            v-if="canCreate"
            value="new"
            data-testid="multi-option-new"
            class="rounded-full px-3 py-2 text-primary"
            @select="pick($event, search.trim())"
          >
            <PlusIcon aria-hidden="true" />
            Add “{{ search.trim() }}”
          </ComboboxItem>
          <ComboboxSeparator v-if="canCreate && entries.length" />
          <ComboboxItem
            v-for="entry in entries"
            :key="entry.id"
            :value="entry.id"
            data-testid="multi-option"
            class="rounded-full px-3 py-2"
            @select="pick($event, entry.name)"
          >
            {{ entry.name }}
          </ComboboxItem>
          <p
            v-if="!entries.length && !canCreate"
            data-testid="multi-hint"
            class="px-3 py-2 text-xs"
          >
            {{ hint }}
          </p>
        </ComboboxViewport>
      </ComboboxList>
    </Combobox>
  </div>
</template>
