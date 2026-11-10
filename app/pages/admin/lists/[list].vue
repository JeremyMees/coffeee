<script setup lang="ts">
import { ArrowLeftIcon } from '@lucide/vue'
import type {
  ColumnDef,
  PaginationState,
  SortingState,
} from '@tanstack/vue-table'
import { refDebounced } from '@vueuse/core'
import { useAdminEntries } from '~/queries/admin'
import AdminEntryActions from '~/components/molecules/AdminEntryActions.vue'

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

const acting = ref<{ action: AdminEntryAction; entry: AdminEntry }>()
const updating = ref(false)
const merging = ref(false)
const deleting = ref(false)
const opened = { update: updating, merge: merging, delete: deleting }

function act(action: AdminEntryAction, entry: AdminEntry) {
  acting.value = { action, entry }
  opened[action].value = true
}

const columns = computed<ColumnDef<AdminEntry, unknown>[]>(() => [
  {
    id: 'name',
    header: capitalised(nouns.value.one),
    cell: ({ row }) =>
      h('div', { class: 'whitespace-normal wrap-anywhere' }, [
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
      h(AdminEntryActions, {
        entry: row.original,
        onAct: (action: AdminEntryAction) => act(action, row.original),
      }),
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
      class="hit-area mt-6 inline-flex items-center gap-2 text-xs uppercase lg:mt-10"
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
    <QuerySection :query="listed" testid="admin-entries">
      <template #default="{ data }">
        <DataTable
          v-model:sorting="sorting"
          v-model:pagination="pagination"
          class="mt-4"
          :columns="columns"
          :data="data.entries"
          :row-count="data.total"
          :row-id="entry => entry.id"
          :empty="`No ${nouns.one} matches.`"
          data-testid="admin-entries"
        />
      </template>

      <template #skeleton><AdminEntriesSkeleton /></template>
    </QuerySection>
    <LazyAdminAddCoffeeSheet v-if="list === 'coffees'" v-model:open="adding" />
    <LazyAddRoasterSheet
      v-else-if="list === 'roasters'"
      v-model:open="adding"
    />
    <LazyAdminEntrySheet
      v-else
      :key="list"
      v-model:open="adding"
      :list="list"
    />
    <template v-if="acting">
      <LazyAdminEditCoffeeSheet
        v-if="list === 'coffees'"
        v-model:open="updating"
        :coffee-id="acting.entry.id"
      />
      <LazyAdminEditRoasterSheet
        v-else-if="list === 'roasters'"
        v-model:open="updating"
        :roaster-id="acting.entry.id"
      />
      <LazyAdminEntrySheet
        v-else
        :key="acting.entry.id"
        v-model:open="updating"
        :list="list"
        :entry="acting.entry"
      />
      <LazyAdminMergeDialog
        v-model:open="merging"
        :list="list"
        :entry="acting.entry"
      />
      <LazyAdminDeleteDialog
        v-model:open="deleting"
        :list="list"
        :entry="acting.entry"
      />
    </template>
  </main>
</template>
