export function adminListRoute(search: string, pageIndex: number) {
  return {
    ...(search && { search }),
    ...(pageIndex > 0 && { page: String(pageIndex + 1) }),
  } as Record<string, string>
}

export function adminListFromRoute(query: Record<string, unknown>) {
  const page = Number.parseInt(queryText(query.page), 10)

  return {
    search: queryText(query.search),
    pageIndex: page > 1 ? page - 1 : 0,
  }
}
