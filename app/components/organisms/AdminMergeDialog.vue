<script setup lang="ts">
import { refDebounced } from '@vueuse/core'
import { useAdminEntries, useAdminEntryMerge } from '~/queries/admin'

const props = defineProps<{ list: AdminList; entry: AdminEntry }>()

const open = defineModel<boolean>('open', { default: false })
const search = ref('')
const searched = refDebounced(search, 150)
const intoId = ref('')
const formError = ref('')
const nouns = computed(() => adminListNouns[props.list])
const { mutateAsync: mergeEntry, isPending } = useAdminEntryMerge()

const candidates = useAdminEntries(
  () => props.list,
  () => ({ search: searched.value, except: props.entry.id, pageSize: '8' }),
)
const options = computed(() => candidates.data.value?.entries ?? [])
const into = computed(() =>
  options.value.find(found => found.id === intoId.value),
)

watch(open, isOpen => {
  if (!isOpen) return

  search.value = ''
  intoId.value = ''
  formError.value = ''
})

async function merge() {
  if (!intoId.value) {
    formError.value = `Pick the ${nouns.value.one} to keep`
    return
  }

  formError.value = ''

  try {
    await mergeEntry({
      list: props.list,
      entryId: props.entry.id,
      intoId: intoId.value,
    })

    open.value = false
  } catch (error) {
    const { fields, message } = serverErrors(error)

    formError.value = fields.intoId ?? message
  }
}
</script>

<template>
  <FormSheet
    v-model:open="open"
    data-testid="admin-merge"
    :title="`Merge ${entry.name}`"
    :description="`Everything that uses ${entry.name} moves onto the ${nouns.one} you keep, and ${entry.name} is removed.`"
  >
    <form
      class="flex flex-col gap-6 px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:px-8"
      novalidate
      data-testid="admin-merge-form"
      @submit.prevent="merge"
    >
      <Input
        v-model="search"
        type="search"
        data-testid="admin-merge-search"
        autocomplete="off"
        :aria-label="`Search ${nouns.many.toLowerCase()}`"
        :placeholder="`Search ${nouns.many.toLowerCase()}`"
      />
      <p v-if="!options.length" class="text-xs" data-testid="admin-merge-empty">
        No other {{ nouns.one }} matches.
      </p>
      <fieldset v-else class="flex flex-col divide-y rounded-[18px] border">
        <legend class="sr-only">Keep</legend>
        <label
          v-for="option in options"
          :key="option.id"
          data-testid="admin-merge-option"
          class="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm has-checked:bg-accent"
        >
          <input
            v-model="intoId"
            type="radio"
            name="admin-merge-into"
            :value="option.id"
            class="accent-primary"
          />
          <span class="min-w-0 flex-1 truncate font-sans font-semibold">
            {{ option.name }}
          </span>
          <span v-if="option.detail" class="shrink-0 text-xs">
            {{ option.detail }}
          </span>
        </label>
      </fieldset>
      <Alert v-if="formError" variant="destructive" data-testid="form-error">
        <AlertDescription>{{ formError }}</AlertDescription>
      </Alert>
      <Button
        type="submit"
        data-testid="admin-merge-submit"
        :disabled="isPending"
      >
        {{ into ? `Merge into ${into.name}` : 'Merge' }}
      </Button>
    </form>
  </FormSheet>
</template>
