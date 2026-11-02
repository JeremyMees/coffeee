import type { PhotoType } from '#shared/types/photos'

export interface Photo {
  data: Buffer
  type: PhotoType
}

export interface EditableCoffeePhoto {
  coffeeId: string
  photoUrl: string | null
}
