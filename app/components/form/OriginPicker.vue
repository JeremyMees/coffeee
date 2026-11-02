<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const model = defineModel<string[]>({ default: () => [] })

defineProps<{ id: string; invalid?: boolean }>()

const byName = [...originCodes].sort((a, b) =>
  origins[a].localeCompare(origins[b]),
)

const search = ref('')
const key = computed(() => nameKey(search.value))
const options = computed(() =>
  byName.filter(
    code =>
      !model.value.includes(code) && nameKey(origins[code]).includes(key.value),
  ),
)
const chips = computed(() =>
  model.value
    .filter(isOriginCode)
    .map(code => ({ key: code, label: origins[code] })),
)

function pick(event: Event, code: string) {
  event.preventDefault()
  model.value = [...model.value, code]
  search.value = ''
}

function remove(code: string) {
  model.value = model.value.filter(picked => picked !== code)
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
          placeholder="Search countries"
          autocomplete="off"
          :aria-invalid="invalid ? true : undefined"
        />
      </ComboboxAnchor>
      <ComboboxList class="rounded-[18px] p-1.5 font-mono ring-primary">
        <ComboboxViewport class="max-h-64 overflow-y-auto">
          <ComboboxItem
            v-for="code in options"
            :key="code"
            :value="code"
            data-testid="origin-option"
            class="rounded-full px-3 py-2"
            @select="pick($event, code)"
          >
            {{ origins[code] }}
          </ComboboxItem>
          <p
            v-if="!options.length"
            data-testid="origin-hint"
            class="px-3 py-2 text-xs"
          >
            No country by that name
          </p>
        </ComboboxViewport>
      </ComboboxList>
    </Combobox>
  </div>
</template>
