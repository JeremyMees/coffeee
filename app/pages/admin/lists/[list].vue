<script setup lang="ts">
import { ArrowLeftIcon } from '@lucide/vue'
import type {
  ColumnDef,
  PaginationState,
  SortingState,
} from '@tanstack/vue-table'
import { refDebounced } from '@vueuse/core'
import { useAdminEntries } from '~/queries/admin'

definePageMeta({
  middleware: 'admin',
  validate: ({ params }) => 'list' in params && isAdminList(params.list),
})

const route = useRoute('admin-lists-list')
const list = computed(() => route.params.list as AdminList)
const nouns = computed(() => adminListNouns[list.value])

useHead({ title: () => `${nouns.value.many} · Admin · Coffeee` })

const initial = adminListFromRoute(route.query)
const search = ref(initial.search)
const searched = refDebounced(search, 200)
const sorting = ref<SortingState>([])
const pagination = ref<PaginationState>({
  pageIndex: initial.pageIndex,
  pageSize: adminListsPageSize,
})
const adding = ref(false)

watch(searched, () => {
  pagination.value = { ...pagination.value, pageIndex: 0 }
})

watch([searched, () => pagination.value.pageIndex], () => {
  navigateTo(
    { query: adminListRoute(searched.value, pagination.value.pageIndex) },
    { replace: true },
  )
})

const listed = useAdminEntries(list, () => ({
  search: searched.value,
  page: String(pagination.value.pageIndex),
}))
await listed.suspense()

const entries = computed(() => listed.data.value?.entries ?? [])
const total = computed(() => listed.data.value?.total ?? 0)

const acting = ref<{
  action: 'update' | 'merge' | 'delete'
  entry: AdminEntry
}>()
const updating = ref(false)
const merging = ref(false)
const deleting = ref(false)
const opened = { update: updating, merge: merging, delete: deleting }

function act(action: 'update' | 'merge' | 'delete', entry: AdminEntry) {
  acting.value = { action, entry }
  opened[action].value = true
}

function actionButton(
  action: 'update' | 'merge' | 'delete',
  label: string,
  entry: AdminEntry,
) {
  return h(
    'button',
    {
      type: 'button',
      'data-testid': `admin-entry-${action}`,
      'aria-label': `${label} ${entry.name}`,
      class:
        'rounded-full px-3 py-1.5 uppercase transition-colors hover:bg-accent',
      onClick: () => act(action, entry),
    },
    label,
  )
}

const columns = computed<ColumnDef<AdminEntry, unknown>[]>(() => [
  {
    id: 'name',
    header: capitalised(nouns.value.one),
    cell: ({ row }) =>
      h('div', [
        h(
          'span',
          {
            class: 'font-sans text-sm font-semibold',
            'data-testid': 'admin-entry-name',
          },
          row.original.name,
        ),
        row.original.detail &&
          h(
            'span',
            { class: 'block', 'data-testid': 'admin-entry-detail' },
            row.original.detail,
          ),
      ]),
  },
  {
    id: 'uses',
    header: capitalised(nouns.value.uses),
    cell: ({ row }) => row.original.uses,
  },
  {
    id: 'actions',
    header: () => h('span', { class: 'sr-only' }, 'Actions'),
    cell: ({ row }) =>
      h('div', { class: 'flex justify-end gap-1' }, [
        actionButton('update', 'Update', row.original),
        actionButton('merge', 'Merge', row.original),
        actionButton('delete', 'Delete', row.original),
      ]),
  },
])

function capitalised(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
</script>

<template>
  <main>
    <NuxtLink
      to="/admin"
      data-testid="admin-back"
      class="mt-6 inline-flex items-center gap-2 text-xs uppercase lg:mt-10"
    >
      <ArrowLeftIcon class="size-4" aria-hidden="true" />
      Admin
    </NuxtLink>
    <PageHeader
      :title="nouns.many"
      :add-label="`Add ${nouns.one}`"
      @add="adding = true"
    />
    <p class="mt-3 text-xs">
      Update a {{ nouns.one }}, merge a duplicate into the one to keep, or
      delete it.
    </p>
    <Input
      v-model="search"
      type="search"
      class="mt-6 max-w-sm"
      data-testid="admin-search"
      autocomplete="off"
      :aria-label="`Search ${nouns.many.toLowerCase()}`"
      :placeholder="`Search ${nouns.many.toLowerCase()}`"
    />
    <DataTable
      v-model:sorting="sorting"
      v-model:pagination="pagination"
      class="mt-4"
      :columns="columns"
      :data="entries"
      :row-count="total"
      :row-id="entry => entry.id"
      :empty="`No ${nouns.one} matches.`"
      data-testid="admin-entries"
    />
    <AdminAddCoffeeSheet v-if="list === 'coffees'" v-model:open="adding" />
    <AdminAddRoasterSheet
      v-else-if="list === 'roasters'"
      v-model:open="adding"
    />
    <AdminEntrySheet v-else :key="list" v-model:open="adding" :list="list" />
    <template v-if="acting">
      <AdminEditCoffeeSheet
        v-if="list === 'coffees'"
        v-model:open="updating"
        :coffee-id="acting.entry.id"
      />
      <AdminEditRoasterSheet
        v-else-if="list === 'roasters'"
        v-model:open="updating"
        :roaster-id="acting.entry.id"
      />
      <AdminEntrySheet
        v-else
        :key="acting.entry.id"
        v-model:open="updating"
        :list="list"
        :entry="acting.entry"
      />
      <AdminMergeDialog
        v-model:open="merging"
        :list="list"
        :entry="acting.entry"
      />
      <AdminDeleteDialog
        v-model:open="deleting"
        :list="list"
        :entry="acting.entry"
      />
    </template>
  </main>
</template>
