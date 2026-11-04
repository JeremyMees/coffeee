type Named = { id: string; name: string }

export function useCanonicalSlug(
  segment: 'coffees' | 'roasters',
  param: () => string,
  named: () => Named | undefined,
) {
  const route = useRoute()

  function canonical() {
    const found = named()

    if (!found || param() === slugFor(found)) return

    return navigateTo(
      route.fullPath.replace(
        `/${segment}/${param()}`,
        `/${segment}/${slugFor(found)}`,
      ),
      { replace: true, redirectCode: 301 },
    )
  }

  watch(() => named()?.name, canonical)

  return canonical()
}
