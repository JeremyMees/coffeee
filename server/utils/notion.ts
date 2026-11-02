import type {
  NotionPage,
  NotionProperty,
  NotionQuery,
} from '#server/types/notion'

const notionApi = 'https://api.notion.com/v1'
const notionVersion = '2022-06-28'

export async function queryNotionDatabase(token: string, databaseId: string) {
  const pages: NotionPage[] = []
  let cursor: string | null = null

  do {
    const response = await fetch(`${notionApi}/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': notionVersion,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page_size: 100,
        ...(cursor && { start_cursor: cursor }),
      }),
    })

    if (!response.ok) {
      throw new Error(
        `Notion answered ${response.status}: ${await response.text()}`,
      )
    }

    const query = (await response.json()) as NotionQuery

    pages.push(...query.results)
    cursor = query.has_more ? query.next_cursor : null
  } while (cursor)

  return pages
}

export function plainText(property: NotionProperty | undefined) {
  const parts =
    property?.type === 'title'
      ? property.title
      : property?.type === 'rich_text'
        ? property.rich_text
        : []

  return parts
    .map(part => part.plain_text)
    .join('')
    .trim()
}

export function selectedName(property: NotionProperty | undefined) {
  return property?.type === 'select' ? (property.select?.name ?? null) : null
}

export function selectedNames(property: NotionProperty | undefined) {
  return property?.type === 'multi_select'
    ? property.multi_select.map(option => option.name)
    : []
}

export function numberOf(property: NotionProperty | undefined) {
  return property?.type === 'number' ? property.number : null
}

export function isChecked(property: NotionProperty | undefined) {
  return property?.type === 'checkbox' && property.checkbox
}

export function relatedIds(property: NotionProperty | undefined) {
  if (property?.type !== 'relation') return []

  if (property.has_more) {
    throw new Error('Notion returned only part of a relation')
  }

  return property.relation.map(related => related.id)
}

export function firstFileUrl(property: NotionProperty | undefined) {
  const [file] = property?.type === 'files' ? property.files : []

  if (!file) return null

  return file.type === 'file' ? file.file.url : file.external.url
}
