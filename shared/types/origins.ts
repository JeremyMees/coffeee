import type { originListFields, origins } from '../utils/origins'

export type OriginCode = keyof typeof origins

export type OriginListField = (typeof originListFields)[number]
