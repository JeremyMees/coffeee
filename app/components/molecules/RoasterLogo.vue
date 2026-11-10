<script setup lang="ts">
import { CameraIcon, Trash2Icon } from '@lucide/vue'
import { useRoasterLogoRemoval, useRoasterLogoUpdate } from '~/queries/roasters'
import { buttonVariants } from '@/components/ui/button'

const props = defineProps<{
  roaster: Pick<ShelfRoaster, 'id' | 'name' | 'logoUrl'>
}>()

const failure = ref('')

const { mutateAsync: updateLogo, isPending: uploading } = useRoasterLogoUpdate()
const { mutateAsync: removeLogo, isPending: removing } = useRoasterLogoRemoval()

const busy = computed(() => uploading.value || removing.value)
const target = computed(() => ({ roasterId: props.roaster.id }))

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
  const logo = input.files?.[0]
  input.value = ''

  if (!logo) return

  await attempt(() => updateLogo({ ...target.value, logo }))
}

function remove() {
  return attempt(() => removeLogo(target.value))
}
</script>

<template>
  <div class="flex flex-col gap-3" data-testid="roaster-logo-field">
    <div class="flex flex-wrap items-center gap-3 text-xs uppercase">
      <RoasterLogoImage :roaster="roaster" class="size-14" />
      <label
        data-testid="roaster-logo-pick"
        :class="
          buttonVariants({
            variant: 'outline',
            size: 'sm',
            class:
              'cursor-pointer focus-within:ring-2 focus-within:ring-ring has-disabled:cursor-default has-disabled:opacity-60',
          })
        "
      >
        <CameraIcon class="size-4" aria-hidden="true" />
        {{ roaster.logoUrl ? 'Replace logo' : 'Add logo' }}
        <input
          type="file"
          accept="image/*"
          class="sr-only"
          data-testid="roaster-logo-input"
          :disabled="busy"
          @change="pick"
        />
      </label>
      <Button
        v-if="roaster.logoUrl"
        type="button"
        data-testid="roaster-logo-remove"
        variant="ghost-destructive"
        size="sm"
        :disabled="busy"
        @click="remove"
      >
        <Trash2Icon class="size-4" aria-hidden="true" />
        Remove logo
      </Button>
      <p v-if="busy" role="status" data-testid="roaster-logo-status">
        {{ uploading ? 'Uploading the logo…' : 'Removing the logo…' }}
      </p>
    </div>
    <Alert
      v-if="failure"
      variant="destructive"
      data-testid="roaster-logo-error"
    >
      <AlertDescription>{{ failure }}</AlertDescription>
    </Alert>
  </div>
</template>
