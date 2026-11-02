export const photoExtensions = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
} as const

export const photoMaxBytes = 2 * 1024 * 1024
export const photoMaxEdge = 1600

export function isPhotoType(
  type: string | undefined,
): type is keyof typeof photoExtensions {
  return type !== undefined && Object.hasOwn(photoExtensions, type)
}

export function photoTypeOf(pathname: string) {
  return Object.entries(photoExtensions).find(([, extension]) =>
    pathname.endsWith(`.${extension}`),
  )?.[0] as keyof typeof photoExtensions | undefined
}

export function blobHost(env: Record<string, string | undefined>) {
  const store = env.BLOB_STORE_ID ?? env.BLOB_READ_WRITE_TOKEN?.split('_')[3]

  return store
    ? `${store.replace(/^store_/, '').toLowerCase()}.public.blob.vercel-storage.com`
    : undefined
}
