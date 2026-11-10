<script setup lang="ts">
import { CameraIcon, ImageIcon, Trash2Icon } from '@lucide/vue'
import { buttonVariants } from '@/components/ui/button'

const props = defineProps<{ prefix: string; currentUrl?: string | null }>()

const photo = defineModel<File | null | undefined>()
const preview = ref('')

watch(
  photo,
  (file, _old, onCleanup) => {
    preview.value = file ? URL.createObjectURL(file) : ''
    onCleanup(() => {
      if (preview.value) URL.revokeObjectURL(preview.value)
    })
  },
  { immediate: true },
)

const shown = computed(() =>
  photo.value === null ? '' : preview.value || props.currentUrl || '',
)

function picked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (file) photo.value = file
}

function remove() {
  photo.value = props.currentUrl ? null : undefined
}
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-3 text-xs uppercase"
    :data-testid="`${prefix}-photo`"
  >
    <div
      class="grid aspect-4/3 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-accent"
    >
      <img
        v-if="shown"
        :src="shown"
        alt="The bag of this coffee"
        class="size-full object-cover"
        :data-testid="`${prefix}-photo-preview`"
      />
      <ImageIcon v-else class="size-6" aria-hidden="true" />
    </div>
    <label
      :class="
        buttonVariants({
          variant: 'outline',
          size: 'sm',
          class: 'cursor-pointer focus-within:ring-2 focus-within:ring-ring',
        })
      "
      :data-testid="`${prefix}-photo-pick`"
    >
      <CameraIcon class="size-4" aria-hidden="true" />
      {{ shown ? 'Replace photo' : 'Add photo' }}
      <input
        type="file"
        accept="image/*"
        class="sr-only"
        :data-testid="`${prefix}-photo-input`"
        @change="picked"
      />
    </label>
    <Button
      v-if="shown"
      type="button"
      :data-testid="`${prefix}-photo-remove`"
      variant="ghost-destructive"
      size="sm"
      @click="remove"
    >
      <Trash2Icon class="size-4" aria-hidden="true" />
      Remove photo
    </Button>
  </div>
</template>
