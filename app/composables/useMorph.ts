import type { MaybeRefOrGetter } from 'vue'

interface MorphParts {
  coffee: 'photo' | 'name'
  roaster: 'logo' | 'name'
}

type Morphing = keyof MorphParts

export function useMorph<Kind extends Morphing>(
  kind: Kind,
  id: MaybeRefOrGetter<string>,
) {
  const opened = useState<string | null>(`${kind}-morph`, () => null)

  function name(part: MorphParts[Kind]) {
    const current = toValue(id)

    return opened.value === current
      ? {
          viewTransitionName: `${kind}-${part}-${current}`,
          viewTransitionClass: `${kind}-${part}`,
        }
      : undefined
  }

  function open() {
    opened.value = toValue(id)
  }

  return { name, open }
}
