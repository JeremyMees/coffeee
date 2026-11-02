import type { RoastLevel } from '#shared/types/coffee'
import type { OriginCode } from '#shared/types/origins'

interface NotionText {
  plain_text: string
}

type NotionFile =
  | { type: 'file'; file: { url: string } }
  | { type: 'external'; external: { url: string } }

export type NotionProperty =
  | { type: 'title'; title: NotionText[] }
  | { type: 'rich_text'; rich_text: NotionText[] }
  | { type: 'select'; select: { name: string } | null }
  | { type: 'multi_select'; multi_select: { name: string }[] }
  | { type: 'number'; number: number | null }
  | { type: 'checkbox'; checkbox: boolean }
  | { type: 'relation'; relation: { id: string }[]; has_more?: boolean }
  | { type: 'files'; files: NotionFile[] }

export interface NotionPage {
  id: string
  created_time: string
  last_edited_time: string
  properties: Record<string, NotionProperty>
}

export interface NotionQuery {
  results: NotionPage[]
  has_more: boolean
  next_cursor: string | null
}

export interface NotionCoffee {
  roaster: string
  name: string
  roastLevel: RoastLevel
  origins: OriginCode[]
  processes: string[]
  varietals: string[]
  flavorNotes: string[]
  link: string | null
  photoUrl: string | null
  purchasedOn: string
  finishedAt: Date | null
  sizeGrams: number | null
  price: number | null
  rating: number | null
  wouldBuyAgain: boolean
}

export interface NotionImport {
  shelfId: string
  userId: string
  flavorNotes: string[]
  coffees: NotionCoffee[]
  copyPhoto: (url: string) => Promise<string | null>
}
