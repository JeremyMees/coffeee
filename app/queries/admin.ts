import { keepPreviousData, useMutation, useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'

function entriesPath(list: AdminList) {
  return `/api/admin/lists/${list}`
}

export function useAdminEntries(
  list: MaybeRefOrGetter<AdminList>,
  query: MaybeRefOrGetter<Record<string, string>>,
) {
  const request = useRequestFetch()

  return useQuery({
    queryKey: computed(() =>
      queryKeys.adminEntries(toValue(list), toValue(query)),
    ),
    queryFn: () =>
      request<AdminEntryPage>(entriesPath(toValue(list)), {
        query: toValue(query),
      }),
    placeholderData: keepPreviousData,
  })
}

function useAdminEntriesChanged() {
  const changed = useChanged()

  return () => changed({ type: 'catalogEntry' })
}

export function useAdminEntryCreate() {
  const changed = useAdminEntriesChanged()

  return useMutation({
    mutationFn: (input: { list: AdminList; body: Record<string, unknown> }) =>
      $fetch<AdminEntry>(entriesPath(input.list), {
        method: 'POST',
        body: input.body,
      }),
    onSuccess: changed,
  })
}

export function useAdminEntryUpdate() {
  const changed = useAdminEntriesChanged()

  return useMutation({
    mutationFn: (input: {
      list: AdminList
      entryId: string
      body: Record<string, unknown>
    }) =>
      $fetch<AdminEntry>(`${entriesPath(input.list)}/${input.entryId}`, {
        method: 'PATCH',
        body: input.body,
      }),
    onSuccess: changed,
  })
}

export function useAdminEntryMerge() {
  const changed = useAdminEntriesChanged()

  return useMutation({
    mutationFn: (input: { list: AdminList; entryId: string; intoId: string }) =>
      $fetch<AdminEntry>(`${entriesPath(input.list)}/${input.entryId}/merge`, {
        method: 'POST',
        body: { intoId: input.intoId },
      }),
    onSuccess: changed,
  })
}

export function useAdminEntryDelete() {
  const changed = useAdminEntriesChanged()

  return useMutation({
    mutationFn: (input: { list: AdminList; entryId: string }) =>
      $fetch(`${entriesPath(input.list)}/${input.entryId}`, {
        method: 'DELETE',
      }),
    onSuccess: changed,
  })
}
