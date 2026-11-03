export const runtimeConfig: Record<string, string> = {}

export function useRuntimeConfig() {
  return runtimeConfig
}

export const storages = new Map<string, Map<string, unknown>>()

export function useStorage(base: string) {
  const items = storages.get(base) ?? new Map<string, unknown>()
  storages.set(base, items)

  return {
    getItem: async (key: string) => items.get(key) ?? null,
    getItemRaw: async (key: string) => items.get(key) ?? null,
    setItemRaw: async (key: string, value: unknown) => {
      items.set(key, value)
    },
    removeItem: async (key: string) => {
      items.delete(key)
    },
  }
}
