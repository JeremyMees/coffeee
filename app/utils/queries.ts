type Loaded<Query> =
  Query extends QueryState<infer Data> ? NonNullable<Data> : never

export function combineQueries<
  Queries extends Record<string, QueryState<unknown>>,
>(
  queries: Queries,
): QueryState<{ [Key in keyof Queries]: Loaded<Queries[Key]> }> {
  const all = Object.values(queries)
  const waiting = () => all.filter(query => query.data.value === undefined)

  return {
    data: computed(() => {
      if (waiting().length) return undefined

      return Object.fromEntries(
        Object.entries(queries).map(([key, query]) => [key, query.data.value]),
      ) as { [Key in keyof Queries]: Loaded<Queries[Key]> }
    }),
    isError: computed(() => waiting().some(query => query.isError.value)),
    fetchStatus: computed(() =>
      waiting().some(query => query.fetchStatus.value === 'paused')
        ? 'paused'
        : waiting().some(query => query.fetchStatus.value === 'fetching')
          ? 'fetching'
          : 'idle',
    ),
    refetch: () => Promise.all(waiting().map(query => query.refetch())),
  }
}
