<script setup lang="ts">
import { CheckIcon, ShareIcon } from '@lucide/vue'
import { useTimeoutFn } from '@vueuse/core'

const props = defineProps<{ name: string; path: string }>()

const origin = useRequestURL().origin
const copied = ref(false)
const { start: forgetCopied } = useTimeoutFn(
  () => {
    copied.value = false
  },
  3000,
  { immediate: false },
)

async function share() {
  const outcome = await shareLink({
    title: props.name,
    url: `${origin}${props.path}`,
  })

  if (outcome !== 'copied') return

  copied.value = true
  forgetCopied()
}
</script>

<template>
  <Button
    type="button"
    data-testid="share"
    variant="outline"
    size="sm"
    @click="share"
  >
    <CheckIcon v-if="copied" class="size-4" aria-hidden="true" />
    <ShareIcon v-else class="size-4" aria-hidden="true" />
    <span aria-live="polite" data-testid="share-label">
      {{ copied ? 'Copied' : 'Share' }}
    </span>
  </Button>
</template>
