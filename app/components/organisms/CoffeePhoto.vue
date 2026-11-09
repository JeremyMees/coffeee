<script setup lang="ts">
import { CameraIcon, ImageIcon, Trash2Icon } from '@lucide/vue'
import { useCoffeePhotoRemoval, useCoffeePhotoUpdate } from '~/queries/coffees'

const props = defineProps<{ coffee: PhotoCoffee }>()

const morph = useMorph('coffee', () => props.coffee.id)
morph.open()

const failure = ref('')

const { mutateAsync: updatePhoto, isPending: uploading } =
  useCoffeePhotoUpdate()
const { mutateAsync: removePhoto, isPending: removing } =
  useCoffeePhotoRemoval()

const busy = computed(() => uploading.value || removing.value)

async function attempt(action: () => Promise<unknown>) {
  failure.value = ''

  try {
    await action()
  } catch (error) {
    failure.value = serverErrors(error).message
  }
}

async function pick(event: Event) {
  const input = event.target as HTMLInputElement
  const photo = input.files?.[0]
  input.value = ''

  if (!photo) return

  await attempt(() => updatePhoto({ coffeeId: props.coffee.id, photo }))
}

function remove() {
  return attempt(() => removePhoto(props.coffee.id))
}
</script>

<template>
  <div>
    <figure
      data-testid="coffee-photo"
      class="aspect-4/3 overflow-hidden rounded-[28px] bg-accent"
      :style="morph.name('photo')"
    >
      <NuxtImg
        v-if="coffee.photoUrl"
        :src="coffee.photoUrl"
        :alt="`The bag of ${coffee.name}`"
        sizes="100vw sm:672px"
        class="size-full object-cover"
        data-testid="coffee-photo-image"
      />
      <div
        v-else
        class="flex size-full flex-col items-center justify-center gap-2 text-xs uppercase"
        data-testid="coffee-photo-placeholder"
      >
        <ImageIcon class="size-8" aria-hidden="true" />
        No photo yet
      </div>
    </figure>
    <div
      v-if="coffee.canEdit"
      class="mt-3 flex flex-wrap items-center gap-2 text-xs uppercase"
    >
      <label
        data-testid="coffee-photo-pick"
        class="flex cursor-pointer items-center gap-2 rounded-full border border-primary px-4 py-2 transition-colors focus-within:ring-2 focus-within:ring-ring hover:bg-primary hover:text-primary-foreground has-disabled:cursor-default has-disabled:opacity-60"
      >
        <CameraIcon class="size-4" aria-hidden="true" />
        {{ coffee.photoUrl ? 'Replace photo' : 'Add photo' }}
        <input
          type="file"
          accept="image/*"
          class="sr-only"
          data-testid="coffee-photo-input"
          :disabled="busy"
          @change="pick"
        />
      </label>
      <button
        v-if="coffee.photoUrl"
        type="button"
        data-testid="coffee-photo-remove"
        class="flex items-center gap-2 rounded-full px-4 py-2 uppercase transition-colors hover:bg-destructive/10 disabled:opacity-60"
        :disabled="busy"
        @click="remove"
      >
        <Trash2Icon class="size-4" aria-hidden="true" />
        Remove photo
      </button>
      <p v-if="busy" role="status" data-testid="coffee-photo-status">
        {{ uploading ? 'Uploading the photo…' : 'Removing the photo…' }}
      </p>
    </div>
    <Alert
      v-if="failure"
      variant="destructive"
      class="mt-3"
      data-testid="coffee-photo-error"
    >
      <AlertDescription>{{ failure }}</AlertDescription>
    </Alert>
  </div>
</template>
