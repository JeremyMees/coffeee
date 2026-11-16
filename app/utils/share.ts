export type ShareOutcome = 'shared' | 'copied' | 'cancelled'

export function shareSheetSupported() {
  return typeof navigator.share === 'function'
}

async function copyLink(url: string): Promise<ShareOutcome> {
  await navigator.clipboard.writeText(url)

  return 'copied'
}

export async function shareLink(link: {
  title: string
  url: string
}): Promise<ShareOutcome> {
  if (!shareSheetSupported()) return copyLink(link.url)

  try {
    await navigator.share(link)

    return 'shared'
  } catch (caught) {
    if (caught instanceof DOMException && caught.name === 'AbortError') {
      return 'cancelled'
    }

    return copyLink(link.url)
  }
}
