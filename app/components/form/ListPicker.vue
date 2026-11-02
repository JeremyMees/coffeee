<script setup lang="ts">
import { refDebounced } from '@vueuse/core'
import { useListSearch } from '~/queries/lists'

defineOptions({ inheritAttrs: false })

const model = defineModel<string>({ default: '' })

const props = defineProps<{
  id: string
  endpoint: string
  placeholder: string
  hint: string
  invalid?: boolean
}>()

const search = ref(model.value)
const searched = refDebounced(search, 150)

const { data } = useListSearch(() => props.endpoint, searched)
const entries = computed(() => data.value ?? [])

const key = computed(() => nameKey(search.value))
const canCreate = computed(
  () =>
    key.value !== '' &&
    !entries.value.some(entry => nameKey(entry.name) === key.value),
)
</script>

<template>
  <Combobox v-model="model" ignore-filter open-on-focus>
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
      <ComboboxViewport>
        <ComboboxItem
          v-for="entry in entries"
          :key="entry.id"
          :value="entry.name"
          data-testid="list-option"
          class="rounded-full px-3 py-2"
        >
          {{ entry.name }}
        </ComboboxItem>
        <ComboboxItem
          v-if="canCreate"
          :value="search.trim()"
          data-testid="list-option-new"
          class="rounded-full px-3 py-2"
        >
          Add “{{ search.trim() }}”
        </ComboboxItem>
        <p
          v-if="!entries.length && !canCreate"
          data-testid="list-hint"
          class="px-3 py-2 text-xs"
        >
          {{ hint }}
        </p>
      </ComboboxViewport>
    </ComboboxList>
  </Combobox>
</template>
